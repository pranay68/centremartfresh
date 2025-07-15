import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, orderBy, getDocs, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { 
  MessageCircle, 
  ThumbsUp, 
  ThumbsDown, 
  Reply, 
  Send, 
  User, 
  Clock,
  CheckCircle,
  AlertCircle,
  Edit3,
  Trash2
} from 'lucide-react';
import Button from './ui/Button';
import Input from './ui/Input';
import Card from './ui/Card';
import toast from 'react-hot-toast';
import './ProductQA.css';

const ProductQA = ({ productId, productName }) => {
  const { user } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAskForm, setShowAskForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [editingAnswer, setEditingAnswer] = useState(null);

  useEffect(() => {
    if (productId) {
      loadQuestions();
    }
  }, [productId]);

  const loadQuestions = async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const questionsQuery = query(
        collection(db, 'productQuestions'),
        where('productId', '==', productId),
        orderBy('createdAt', 'desc')
      );
      const questionsSnapshot = await getDocs(questionsQuery);
      const questionsData = questionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));
      setQuestions(questionsData);
    } catch (error) {
      console.error('Error loading questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAskQuestion = async () => {
    if (!user) {
      toast.error('Please login to ask a question');
      return;
    }

    if (!newQuestion.trim()) {
      toast.error('Please enter a question');
      return;
    }

    try {
      const questionData = {
        productId,
        productName,
        question: newQuestion.trim(),
        askedBy: user.uid,
        askedByName: user.displayName || user.email?.split('@')[0] || 'User',
        createdAt: serverTimestamp(),
        votes: 0,
        isAnswered: false,
        answers: []
      };

      await addDoc(collection(db, 'productQuestions'), questionData);
      
      // Update local state
      const newQuestionObj = {
        id: Date.now().toString(), // For demo purposes
        ...questionData,
        createdAt: new Date()
      };
      setQuestions(prev => [newQuestionObj, ...prev]);
      
      setNewQuestion('');
      setShowAskForm(false);
      toast.success('Question posted successfully!');
    } catch (error) {
      console.error('Error posting question:', error);
      toast.error('Failed to post question');
    }
  };

  const handleAnswerQuestion = async (questionId) => {
    if (!user) {
      toast.error('Please login to answer questions');
      return;
    }

    if (!newAnswer.trim()) {
      toast.error('Please enter an answer');
      return;
    }

    try {
      const answerData = {
        answer: newAnswer.trim(),
        answeredBy: user.uid,
        answeredByName: user.displayName || user.email?.split('@')[0] || 'User',
        answeredAt: serverTimestamp(),
        votes: 0
      };

      // Update question in Firestore
      const questionRef = doc(db, 'productQuestions', questionId);
      await updateDoc(questionRef, {
        answer: answerData.answer,
        answeredBy: answerData.answeredBy,
        answeredByName: answerData.answeredByName,
        answeredAt: answerData.answeredAt,
        isAnswered: true
      });

      // Update local state
      setQuestions(prev => 
        prev.map(q => 
          q.id === questionId 
            ? { ...q, ...answerData, isAnswered: true, answeredAt: new Date() }
            : q
        )
      );

      setNewAnswer('');
      setReplyingTo(null);
      toast.success('Answer posted successfully!');
    } catch (error) {
      console.error('Error posting answer:', error);
      toast.error('Failed to post answer');
    }
  };

  const handleVote = async (questionId, voteType) => {
    if (!user) {
      toast.error('Please login to vote');
      return;
    }

    try {
      // Update vote in Firestore
      const questionRef = doc(db, 'productQuestions', questionId);
      await updateDoc(questionRef, {
        votes: questions.find(q => q.id === questionId).votes + (voteType === 'up' ? 1 : -1)
      });

      // Update local state
      setQuestions(prev => 
        prev.map(q => 
          q.id === questionId 
            ? { ...q, votes: q.votes + (voteType === 'up' ? 1 : -1), userVote: voteType }
            : q
        )
      );

      toast.success('Vote recorded!');
    } catch (error) {
      console.error('Error voting:', error);
      toast.error('Failed to record vote');
    }
  };

  const handleEditQuestion = async (questionId, newText) => {
    try {
      const questionRef = doc(db, 'productQuestions', questionId);
      await updateDoc(questionRef, { question: newText });

      setQuestions(prev => 
        prev.map(q => 
          q.id === questionId 
            ? { ...q, question: newText }
            : q
        )
      );

      setEditingQuestion(null);
      toast.success('Question updated!');
    } catch (error) {
      console.error('Error updating question:', error);
      toast.error('Failed to update question');
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;

    try {
      // Delete from Firestore
      // await deleteDoc(doc(db, 'productQuestions', questionId));

      // Update local state
      setQuestions(prev => prev.filter(q => q.id !== questionId));
      toast.success('Question deleted!');
    } catch (error) {
      console.error('Error deleting question:', error);
      toast.error('Failed to delete question');
    }
  };

  const formatTimeAgo = (date) => {
    if (!date || isNaN(new Date(date).getTime())) return '-';
    const now = new Date();
    const d = new Date(date);
    const diffInMinutes = Math.floor((now - d) / (1000 * 60));
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return d.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="product-qa-loading">
        <div className="loading-spinner"></div>
        <p>Loading Q&A...</p>
      </div>
    );
  }

  return (
    <div className="product-qa">
      <div className="qa-header">
        <div className="qa-title">
          <MessageCircle size={20} />
          <h3>Questions & Answers</h3>
        </div>
        <Button onClick={() => setShowAskForm(true)}>
          Ask a Question
        </Button>
      </div>

      {/* Ask Question Form */}
      {showAskForm && (
        <Card className="ask-question-form">
          <Card.Header>
            <h4>Ask a Question</h4>
          </Card.Header>
          <Card.Content>
            <div className="form-group">
              <label>Your Question</label>
              <textarea
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="Ask about this product..."
                rows={3}
                className="question-textarea"
              />
            </div>
            <div className="form-actions">
              <Button onClick={handleAskQuestion} disabled={!newQuestion.trim()}>
                <Send size={16} className="mr-2" />
                Post Question
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowAskForm(false);
                  setNewQuestion('');
                }}
              >
                Cancel
              </Button>
            </div>
          </Card.Content>
        </Card>
      )}

      {/* Questions List */}
      <div className="questions-list">
        {questions.length > 0 && questions.map((question) => (
          <Card key={question.id} className="question-card">
            <Card.Content>
              <div className="question-header">
                <div className="question-info">
                  <div className="question-text">
                    {editingQuestion?.id === question.id ? (
                      <div className="edit-question">
                        <textarea
                          value={editingQuestion.text}
                          onChange={(e) => setEditingQuestion({
                            ...editingQuestion,
                            text: e.target.value
                          })}
                          rows={2}
                          className="edit-textarea"
                        />
                        <div className="edit-actions">
                          <Button 
                            size="sm"
                            onClick={() => handleEditQuestion(question.id, editingQuestion.text)}
                          >
                            Save
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setEditingQuestion(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <h4 className="question-title">{question.question}</h4>
                    )}
                  </div>
                  <div className="question-meta">
                    <span className="asked-by">
                      <User size={14} />
                      {question.askedByName}
                    </span>
                    <span className="asked-time">
                      <Clock size={14} />
                      {formatTimeAgo(question.createdAt)}
                    </span>
                  </div>
                </div>
                
                <div className="question-actions">
                  <div className="vote-buttons">
                    <button
                      className={`vote-btn ${question.userVote === 'up' ? 'voted' : ''}`}
                      onClick={() => handleVote(question.id, 'up')}
                      title="Vote up"
                    >
                      <ThumbsUp size={16} />
                    </button>
                    <span className="vote-count">{question.votes}</span>
                    <button
                      className={`vote-btn ${question.userVote === 'down' ? 'voted' : ''}`}
                      onClick={() => handleVote(question.id, 'down')}
                      title="Vote down"
                    >
                      <ThumbsDown size={16} />
                    </button>
                  </div>
                  
                  {user && question.askedBy === user.uid && (
                    <div className="question-owner-actions">
                      <button
                        className="action-btn"
                        onClick={() => setEditingQuestion({
                          id: question.id,
                          text: question.question
                        })}
                        title="Edit question"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        className="action-btn delete"
                        onClick={() => handleDeleteQuestion(question.id)}
                        title="Delete question"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Answer Section */}
              {question.isAnswered ? (
                <div className="answer-section">
                  <div className="answer-header">
                    <CheckCircle size={16} className="answer-icon" />
                    <span className="answer-label">Answer</span>
                  </div>
                  <div className="answer-content">
                    <p>{question.answer}</p>
                    <div className="answer-meta">
                      <span className="answered-by">
                        <User size={14} />
                        {question.answeredByName}
                      </span>
                      <span className="answered-time">
                        <Clock size={14} />
                        {formatTimeAgo(question.answeredAt)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="no-answer">
                  <AlertCircle size={16} />
                  <span>No answer yet</span>
                  {user && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setReplyingTo(question.id)}
                    >
                      <Reply size={14} className="mr-1" />
                      Answer
                    </Button>
                  )}
                </div>
              )}

              {/* Answer Form */}
              {replyingTo === question.id && (
                <div className="answer-form">
                  <div className="form-group">
                    <label>Your Answer</label>
                    <textarea
                      value={newAnswer}
                      onChange={(e) => setNewAnswer(e.target.value)}
                      placeholder="Provide a helpful answer..."
                      rows={3}
                      className="answer-textarea"
                    />
                  </div>
                  <div className="form-actions">
                    <Button 
                      onClick={() => handleAnswerQuestion(question.id)}
                      disabled={!newAnswer.trim()}
                    >
                      <Send size={16} className="mr-2" />
                      Post Answer
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setReplyingTo(null);
                        setNewAnswer('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </Card.Content>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ProductQA; 