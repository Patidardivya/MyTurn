import React from 'react';
import { Link } from 'react-router-dom';

const Landing: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8">
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
          MyTurn
        </h1>
        <p className="text-2xl text-slate-600 mb-8 font-light">
          One Token. Zero Standing.
        </p>
        
        <p className="text-lg text-slate-500 mb-10">
          Smart digital queue and appointment management system where you can take a digital token, 
          track your position, see estimated waiting time, and avoid physically standing in queues.
        </p>
        
        <div className="flex gap-4 justify-center">
          <Link 
            to="/register" 
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Get MyTurn
          </Link>
          <Link 
            to="/login" 
            className="px-6 py-3 bg-white text-blue-600 border border-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition"
          >
            I already have an account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Landing;
