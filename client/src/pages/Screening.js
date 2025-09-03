import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

const Screening = () => {
  const [currentSection, setCurrentSection] = useState(0);
  const [responses, setResponses] = useState({
    phq9: Array(9).fill(0),
    gad7: Array(7).fill(0),
    ghq: Array(12).fill(0)
  });
  const [loading, setLoading] = useState(false);
  const { updateScreeningData } = useAuth();
  const navigate = useNavigate();

  const phq9Questions = [
    "Little interest or pleasure in doing things",
    "Feeling down, depressed, or hopeless",
    "Trouble falling or staying asleep, or sleeping too much",
    "Feeling tired or having little energy",
    "Poor appetite or overeating",
    "Feeling bad about yourself or that you are a failure",
    "Trouble concentrating on things",
    "Moving or speaking slowly, or being fidgety/restless",
    "Thoughts that you would be better off dead or hurting yourself"
  ];

  const gad7Questions = [
    "Feeling nervous, anxious, or on edge",
    "Not being able to stop or control worrying",
    "Worrying too much about different things",
    "Trouble relaxing",
    "Being so restless that it's hard to sit still",
    "Becoming easily annoyed or irritable",
    "Feeling afraid as if something awful might happen"
  ];

  const ghqQuestions = [
    "Been able to concentrate on what you're doing",
    "Lost much sleep over worry",
    "Felt that you were playing a useful part in things",
    "Felt capable of making decisions about things",
    "Felt constantly under strain",
    "Felt you couldn't overcome your difficulties",
    "Been able to enjoy your normal day-to-day activities",
    "Been able to face up to problems",
    "Been feeling unhappy or depressed",
    "Been losing confidence in yourself",
    "Been thinking of yourself as a worthless person",
    "Been feeling reasonably happy, all things considered"
  ];

  const responseOptions = [
    "Not at all",
    "Several days",
    "More than half the days",
    "Nearly every day"
  ];

  const sections = [
    { name: 'PHQ-9 (Depression)', questions: phq9Questions, key: 'phq9' },
    { name: 'GAD-7 (Anxiety)', questions: gad7Questions, key: 'gad7' },
    { name: 'GHQ-12 (General Health)', questions: ghqQuestions, key: 'ghq' }
  ];

  const handleResponse = (questionIndex, value) => {
    const newResponses = { ...responses };
    newResponses[sections[currentSection].key][questionIndex] = value;
    setResponses(newResponses);
  };

  const calculateScores = () => {
    const phq9Score = responses.phq9.reduce((sum, val) => sum + val, 0);
    const gad7Score = responses.gad7.reduce((sum, val) => sum + val, 0);
    const ghqScore = responses.ghq.reduce((sum, val) => sum + val, 0);
    
    return { phq9Score, gad7Score, ghqScore };
  };

  const handleNext = () => {
    if (currentSection < sections.length - 1) {
      setCurrentSection(currentSection + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    const scores = calculateScores();
    
    const result = await updateScreeningData(scores);
    
    if (result.success) {
      toast.success('Screening completed successfully!');
      navigate('/dashboard');
    } else {
      toast.error('Failed to save screening data. Please try again.');
    }
    
    setLoading(false);
  };

  const currentQuestions = sections[currentSection].questions;
  const currentKey = sections[currentSection].key;
  const progress = ((currentSection + 1) / sections.length) * 100;

  return (
    <div className="screening-container">
      <div className="screening-header">
        <h1>Mental Health Screening</h1>
        <p>
          This confidential assessment helps us understand your current mental health 
          and provide personalized support. All responses are private and secure.
        </p>
        
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }}></div>
        </div>
        
        <div className="section-info">
          <h2>{sections[currentSection].name}</h2>
          <p>Section {currentSection + 1} of {sections.length}</p>
        </div>
      </div>

      <div className="screening-content">
        <div className="questions">
          <p className="instruction">
            Over the last 2 weeks, how often have you been bothered by the following:
          </p>
          
          {currentQuestions.map((question, index) => (
            <div key={index} className="question-block">
              <h3>{index + 1}. {question}</h3>
              <div className="response-options">
                {responseOptions.map((option, optionIndex) => (
                  <label key={optionIndex} className="response-option">
                    <input
                      type="radio"
                      name={`question-${index}`}
                      value={optionIndex}
                      checked={responses[currentKey][index] === optionIndex}
                      onChange={() => handleResponse(index, optionIndex)}
                    />
                    <span className="option-text">{option}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="screening-navigation">
          <button 
            onClick={handlePrevious}
            disabled={currentSection === 0}
            className="btn btn-outline"
          >
            Previous
          </button>
          
          <button 
            onClick={handleNext}
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? 'Saving...' : 
             currentSection === sections.length - 1 ? 'Complete Assessment' : 'Next Section'}
          </button>
        </div>
      </div>

      <div className="screening-info">
        <div className="info-card">
          <h3>About This Assessment</h3>
          <ul>
            <li><strong>PHQ-9:</strong> Measures depression severity (0-27 scale)</li>
            <li><strong>GAD-7:</strong> Assesses anxiety levels (0-21 scale)</li>
            <li><strong>GHQ-12:</strong> Evaluates general psychological wellbeing</li>
          </ul>
          <p>
            These are evidence-based screening tools used by mental health professionals 
            worldwide. Your results will help us provide appropriate support and resources.
          </p>
        </div>
        
        <div className="privacy-notice">
          <h4>🔒 Your Privacy Matters</h4>
          <p>
            All responses are encrypted and stored securely. Only you and authorized 
            counselors (with your permission) can access your results.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Screening;
