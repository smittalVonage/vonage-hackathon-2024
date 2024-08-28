import React from 'react';

const OTPInput = ({ value, onChange }) => {
  return (
    <div className="flex space-x-2">
      {value.split('').map((char, index) => (
        <input
          key={index}
          type="text"
          maxLength="1"
          className="w-12 h-12 text-2xl text-center text-black"
          value={char}
          onChange={(e) => onChange(e.target.value, index)}
          onKeyDown={(e) => e.key === 'Backspace' && onChange('', index)}
        />
      ))}
    </div>
  );
};

export default OTPInput;
