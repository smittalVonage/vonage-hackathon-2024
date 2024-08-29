const json2csv = require('json2csv');
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();
const { Vonage } = require('@vonage/server-sdk');

const app = express();
app.use(express.json());

const cors = require('cors');
app.use(cors());

app.use(express.static(path.join(__dirname, 'build')));


const vonageClient = new Vonage({
    apiKey: process.env.VONAGE_API_KEY,
    apiSecret: process.env.VONAGE_API_SECRET
});


const dbUrl = process.env.DB_URL;

//generative AI credentials
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const expenseSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    category: { type: String, required: true },
    subCategory: { type: String, required: true },
    date: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    whatsappNumber: { type: String, required: true, index: true, unique: true },
    currency: { type: String, required: true }
});

const otpRequestSchema = new mongoose.Schema({
    phoneNumber: { type: String, required: true, index: true },
    requestId: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: '10m' }
});


const User = mongoose.model("User", userSchema, "users");
const Expense = mongoose.model("Expense", expenseSchema, "expenses");
const OtpRequest = mongoose.model("OtpRequest", otpRequestSchema);

mongoose.connect(dbUrl)
    .then(() => console.log('MongoDB connected...'))
    .catch(err => console.log(err));

const sendWhatsappMessage = async (number, message) => {
  await axios.post(
    "https://messages-sandbox.nexmo.com/v0.1/messages",
    {
      from: {
        type: "whatsapp",
        number: process.env.VONAGE_WATSAPP_NUMBER,
      },
      to: {
        type: "whatsapp",
        number: number,
      },
      message: {
        content: {
          type: "text",
          text: message,
        },
      },
    },
    {
      auth: {
        username: process.env.VONAGE_API_KEY,
        password: process.env.VONAGE_API_SECRET,
      },
    }
  )
}

async function getUserExpensesAsCSV(userId) {
    try {
        const user = await User.findById(userId);
        if (!user) {
            return ''; // Return empty string if user not found
        }

        const expenses = await Expense.find({ user: userId }).sort({ date: -1 }).limit(100);
        if (!expenses || expenses.length === 0) {
            return ''; // Return empty string if no expenses found
        }

        const csv = json2csv.parse(expenses, {
            fields: [
                { label: 'Description', value: 'description' },
                { label: 'Amount', value: (row) => `${user.currency} ${row.amount}` },
                { label: 'Category', value: 'category' },
                { label: 'Sub Category', value: 'subCategory' },
                { label: 'Date', value: (row) => row.date.toISOString().split('T')[0] }
            ]
        });

        return csv;
    } catch (error) {
        console.error('Error fetching expenses:', error);
        return ''; // Return empty string in case of error
    }
}

// Function to insert a new expense
async function insertNewEntry(expense) {
    try {
        const user = await User.findById(expense.user);
        if (!user) {
            return { error: "User not found. Please signup.", message: "User not found. Please signup." };
        }

        const newExpense = await Expense.create(expense);
        return newExpense;
    } catch (error) {
        console.error('Error creating expense:', error);
        return { error: "Error creating expense. Please try again.", message: "Error creating expense. Please try again." };
    }
}

// Function to find user by phone number
async function findUserByPhoneNumber(phoneNumber) {
    try {
        const user = await User.findOne({ whatsappNumber: phoneNumber });
        if (!user) {
            return { error: "User not found", message: "User not found" };
        }
        return user;
    } catch (error) {
        console.error('Error finding user:', error);
        return { error: "Error finding user. Please try again.", message: "Error finding user. Please try again." };
    }
}

//working /otp/send
app.post("/otp/send", async (req, res) => {
    const { phoneNumber } = req.body;

    try {
        // Send OTP request
        const response = await vonageClient.verify.start({
            number: phoneNumber,
            brand: "Vonage" // Ensure this is within allowed length
        });

        console.log('API response:', response);
        
        // Check the result of the otp sent
        if (response.status !== "0") {
            return res.status(400).json({ error: "Error in sending otp" });
        }


        // Save the OTP request to the database
        const updatedOtpRequest = await OtpRequest.findOneAndUpdate(
            { phoneNumber },
            { phoneNumber, requestId: response.request_id },
            { upsert: true, new: true }
        );

        // Send success response
        return res.status(200).json({
            message: "OTP sent successfully",
            request_id: response.request_id
        });

    } catch (err) {
        console.error('Error:', err);
        return res.status(500).json({ error: "Error sending OTP" });
    }
});

// OTP Verification Endpoint
app.post("/otp/verify", async (req, res) => {
    const { phoneNumber, code, newUser, name, currency } = req.body;

    try {
        // Find OTP request
        const otpRequest = await OtpRequest.findOne({ phoneNumber });
        if (!otpRequest) {
            return res.status(400).json({ error: "No OTP request found for this number" });
        }
        

        // Verify the OTP
        const result = await vonageClient.verify.check(otpRequest.requestId, code);
        
        console.log('API response:', result);

        // Check the result of the verification
        if (result.status !== "0") {
            return res.status(400).json({ error: "Invalid OTP" });
        }

        // Find the user in the database
        let user = await User.findOne({ whatsappNumber: phoneNumber });

        if (newUser === true) {
            if (user) {
                return res.status(409).json({ error: "User already exists" });
            }
            user = await User.create({ whatsappNumber: phoneNumber, currency, name });
        } else if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Remove the OTP request after successful verification
        await OtpRequest.deleteOne({ phoneNumber });

        // Send success response
        return res.status(200).json({
            message: newUser === "true" ? "User created successfully" : "OTP verified successfully",
            user: {
                id: user._id,
                name: user.name,
                phoneNumber: user.whatsappNumber,
                currency: user.currency
            }
        });
        
    } catch (error) {
        console.error('Error during OTP verification:', error);
        return res.status(500).json({ error: "Error processing OTP verification" });
    }
});

app.post('/getInsight', async (req, res) => {
    const { expenses } = req.body;

    try {
        // Initialize the generative model
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
        });

        const generationConfig = {
            temperature: 0.6,
            topP: 0.95,
            topK: 64,
            maxOutputTokens: 8192,
        };

        // Remove the systemInstruction from startChat
        const chatSession = model.startChat({
            generationConfig,
        });

        // Send the expense data as a user message, including the instruction in the prompt
        const result = await chatSession.sendMessage(
            `Based on the following expenses done by the user for the current month, provide a short and crisp one-line insight:\n\n${expenses}`
        );

        // Extract the text from the response
        const insight = result.response.text();
        res.json({ insight });
    } catch (error) {
        console.error('Error generating insight:', error);
        res.status(500).json({ error: 'Failed to generate insight' });
    }
});

// Webhook for processing user requests
app.post('/webhook/whatsapp', async (req, res) => {
    const from = req.body.from;
    const body = req.body.text;

    console.log("In /webhook from: ", from);
    console.log("body is: ", body);

    let user = null;
    let tempFrom = null;
    
    if (!from.startsWith("+")) {
        tempFrom = "+" + from;
    }


    const userResult = await findUserByPhoneNumber(tempFrom);
    if (userResult.error) {
        const message = 'You have not yet registered on web. Please register yourself.';
        console.log("returning un-registered user response");
        return res.send(createVonageResponse(from, message));
    }
    user = userResult;
    console.log("user: ", user);

    const incomingText = "Join couch plow";
    let message;
    if (body === incomingText) {
        message = `Hey ${user.name}, hope you’re doing well. Would you like to log a new expense, or would you prefer to check the status of your current expenses?`;
        return res.send(createVonageResponse(from, message));
    }

    const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: `Detect intent in one word out of these:\n\nspend, analytics, other\n\nspend - related to logging a new expense/spend and nothing else. \nanalytics - related to the past spends/expenses or their analysis\nother - any other apart from two\n\nIf it is a spend, \n\nthen it should contain the following stuff - what was the expense (i.e. description), amount, date, then you will detect the category and subcategory from below\n1. Housing - Rent, Taxes, Insurance, Utilities, Repairs, Improvement, Fees\n2. Transportation - Payments, Fuel, Insurance, Repairs, Public, Parking, Tolls, Licensing\n3. Food - Groceries, Dining, Coffee, Delivery, Snacks\n4. Utilities - Electricity, Water, Gas, Internet, Cable, Trash, Phone\n5. Health - Insurance, Dental, Vision, Medical, Prescriptions, Medications, Gym, Wellness\n6. Personal - Haircuts, Skincare, Makeup, Hygiene, Clothing\n7. Education - Tuition, Books, Loans, Courses, Activities\n9. Entertainment - Subscriptions, Movies, Concerts, Hobbies, Books\n10. Travel - Flights, Accommodation, Transportation, Insurance, Food, Activities, Souvenirs\n12. EMI - Home loan, Mobile loan, Vehicle loan, Personal loan\n13. Miscellaneous - Gifts, Pet, Office, Services \n\nthe date is in YYYY-MM-DD format. default value - today - ${new Date().getFullYear()}-${new Date().getUTCMonth() + 1}-${new Date().getDate()}\n\ngive output as \n\n{\n  \"description\": \"description of the expense\",\n  \"amount\": 100,\n  \"category\": \"main category of the expense\",\n  \"subCategory\": \"subcategory of the expense\",\n  \"date\": \"date of the purchase in format ISO\"\n}`,
    });
    const generationConfig = {
        temperature: 0.6,
        topP: 0.95,
        topK: 64,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
    };

    const chatSession = model.startChat({
        generationConfig
    });

    const result = await chatSession.sendMessage(body);
    const aiResponse = result.response.text()
    console.log("Response Json : ", aiResponse);
    const aiResponseJson = JSON.parse(aiResponse);
    console.log("Response aiResponseJson : ", aiResponseJson);

    if (aiResponseJson.intent == 'analytics') {
        try {
            // Fetch expense data and get CSV
            const expenseCsv = await getUserExpensesAsCSV(user._id);
            if (expenseCsv.error) {
                throw new Error(expenseCsv.message);
             }
            const analyticsModel = genAI.getGenerativeModel({
                model: "gemini-1.5-flash",
                systemInstruction: "Based on below expenses done by user give answer to user. Optimize as WhatsApp message reply and add emojis.\n\nExpense History:\n" + expenseCsv,
            });

            const analyticsGenerationConfig = {
                temperature: 0.6,
                topP: 0.95,
                topK: 64,
                maxOutputTokens: 8192,
                responseMimeType: "text/plain",
            };

            const analyticsChatSession = analyticsModel.startChat({
                analyticsGenerationConfig
            });

            const analyticsAiResult = await analyticsChatSession.sendMessage(body);
            const analyticsAiResponse = analyticsAiResult.response.text()
            return res.send(createVonageResponse(from, analyticsAiResponse));          
        }   
        catch (error) {
            console.error('Error:', error);
            const message = 'Please ask about spends you have done or spend you want to log.';
            return res.send(createVonageResponse(from, message));
        }
    } else if(aiResponseJson.category != null) {
    
        console.log("creating expense");
        // Create expense
        const expense = {
            user: user._id,
            description: aiResponseJson.description,
            amount: aiResponseJson.amount,
            date: aiResponseJson.date,
            category: aiResponseJson.category,
            subCategory: aiResponseJson.subCategory,
        }

            try {
                const expenseResponse = await insertNewEntry(expense);
                if (expenseResponse.error) {
                    return res.send(createVonageResponse(from, expenseResponse.message));
                }

                const message = `Your expense is logged successfully as below:\n*📝 Description:* ${expenseResponse.description}\n*✨ Category:* ${expenseResponse.category}\n*🎫 Sub Category:* ${expenseResponse.subCategory}\n*💲 Amount:* ${user.currency} ${expenseResponse.amount}\n*📅 Date:* ${expenseResponse.date}\n\n`;
                return res.send(createVonageResponse(from, message));

            } catch (err) {
                console.error('Error:', err);
                const message = 'Something went wrong. Please try again.';
                return res.send(createVonageResponse(from, message));
            }
    } else {
        const message = 'Something went wrong. Please try again.';
        return res.send(createVonageResponse(from, message));
    }
});

// Webhook for processing user requests
app.post('/webhook/ui', async (req, res) => {
    const from = req.body.from;
    const body = req.body.text;

    console.log("In /webhook from: ", from);
    console.log("body is: ", body);

    let user = null;
    //let temp = "+" + from;
    // Check if the first character is not a "+"
    if (!from.startsWith("+")) {
        from = "+" + from;
    }
    console.log("altered from is: ", from);


    // Check if user exists in MongoDB
    const userResult = await findUserByPhoneNumber(from);
    if (userResult.error) {
        const message = 'You have not yet registered on web. Please register yourself.';
        console.log("returning un-registered user response");
        return res.status(404).send({ error: "User not found" });
    }
    user = userResult;

        try {
        const expenseCsv = await getUserExpensesAsCSV(user._id);

        // If expenseCsv is an empty string, it means no expenses were found
        if (expenseCsv === '') {
            // Set headers to indicate a CSV file
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=expenses.csv');

            return res.send('');
        }

        // Otherwise, assume it's a valid CSV
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=expenses.csv');

        return res.send(expenseCsv);
    } catch (error) {
        console.error('Error processing request:', error);
        return res.status(200).send(''); // Return 200 OK with empty CSV in case of errors
    }

});


const handleStatus = (req, res) => {
  res.status(200).end()
}

app.post("/webhooks/status", handleStatus)

// Anything that doesn't match the API routes should serve the React frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname + '/build/index.html'));
});

app.listen(3002, () => console.log('Server started on port 3002'));

// Utility function to create a Vonage response
function createVonageResponse(from, message) {
    return sendWhatsappMessage(from, message);
}

