import React, { useState } from 'react';
import './QnA.css';

const QnA = ({ qna = [], onSubmitQuestion }) => {
  const [question, setQuestion] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question) return;
    setSubmitting(true);
    await onSubmitQuestion({ question });
    setQuestion('');
    setSubmitting(false);
  };

  return (
    <div className="qna-section">
      <h4>Questions & Answers</h4>
      <form className="qna-form" onSubmit={handleSubmit}>
        <textarea className="qna-textarea" placeholder="Ask a question about this product..." value={question} onChange={e => setQuestion(e.target.value)} />
        <button className="qna-submit-btn" type="submit" disabled={submitting || !question}>Ask Question</button>
      </form>
      <div className="qna-list">
        {qna.length === 0 && <div className="no-qna">No questions yet. Be the first to ask!</div>}
        {qna.map(q => (
          <div className="qna-item" key={q.id}>
            <div className="qna-question">
              <span className="qna-user">{q.userName ? `${q.userName.slice(0,3)}${'*'.repeat(Math.max(0, q.userName.length-3))}` : '***'}:</span> {q.question}
            </div>
            {q.answer ? (
              <div className="qna-answer"><span className="qna-answered-by">Store:</span> {q.answer}</div>
            ) : (
              <div className="qna-unanswered">No answer yet.</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default QnA; 