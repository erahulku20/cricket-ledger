import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth';

export default function Login() {
  const { sendCode, verifyCode } = useAuth();
  const [method, setMethod] = useState('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('request');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [devCode, setDevCode] = useState(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const handleSendCode = async (event) => {
    if (event) event.preventDefault();
    setError('');
    setMessage('');
    setDevCode(null);
    setSending(true);

    try {
      const payload = {
        email: method === 'email' ? email.trim() : undefined,
        phone: method === 'phone' ? phone.trim() : undefined,
      };
      const response = await sendCode(payload, 'login');
      setStep('verify');
      setSentTo(method === 'email' ? payload.email : payload.phone);
      setMessage('Verification code sent. Check your email or phone.');
      setDevCode(response?.debugCode || null);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Unable to send verification code');
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setVerifying(true);

    try {
      await verifyCode({
        code: code.trim(),
        email: method === 'email' ? email.trim() : undefined,
        phone: method === 'phone' ? phone.trim() : undefined,
      });
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Unable to verify code');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setMessage('');
    await handleSendCode();
  };

  return (
    <div className="auth-shell">
      <div className="panel-soft max-w-md mx-auto p-8 mt-20 rounded-[32px] shadow-xl">
        <h1 className="title-xl mb-4">Sign in</h1>
        <p className="text-sm text-slate-600 mb-6">
          Use email or phone to receive a one-time code. New users should sign up first.
        </p>

        <div className="tabs mb-6">
          <button type="button" className={`tab ${method === 'email' ? 'tab-active' : ''}`} onClick={() => setMethod('email')}>
            Email
          </button>
          <button type="button" className={`tab ${method === 'phone' ? 'tab-active' : ''}`} onClick={() => setMethod('phone')}>
            Phone
          </button>
        </div>

        <form onSubmit={step === 'request' ? handleSendCode : handleVerify} className="space-y-4">
          {method === 'email' ? (
            <div>
              <label className="block text-sm text-slate-700 mb-2">Email address</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full field text-sm"
                placeholder="you@example.com"
                type="email"
                required={step === 'request'}
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm text-slate-700 mb-2">Phone number</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full field text-sm"
                placeholder="1234567890"
                type="tel"
                required={step === 'request'}
              />
            </div>
          )}

          {step === 'verify' && (
            <>
              <div className="text-sm text-slate-600">
                A code was sent to <strong>{sentTo}</strong>. It expires in 5 minutes.
              </div>
              <div>
                <label className="block text-sm text-slate-700 mb-2">Verification code</label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full field text-sm"
                  placeholder="Enter the code you received"
                  required
                />
              </div>
            </>
          )}

          {error && <p className="text-red-600 text-sm">{error}</p>}
          {message && <p className="text-emerald-700 text-sm">{message}</p>}
          {devCode && <p className="text-slate-500 text-sm">DEV CODE: {devCode}</p>}

          <button type="submit" disabled={sending || verifying} className="btn-primary w-full py-3 text-sm">
            {step === 'request' ? (sending ? 'Sending...' : 'Send verification code') : (verifying ? 'Verifying...' : 'Verify and sign in')}
          </button>

          {step === 'verify' && (
            <>
              <button type="button" className="btn-muted w-full py-3 text-sm" onClick={() => { setStep('request'); setMessage(''); setError(''); setDevCode(null); }}>
                Change login details
              </button>
              <button type="button" className="btn-muted w-full py-3 text-sm" onClick={handleResend} disabled={sending}>
                {sending ? 'Resending...' : 'Resend code'}
              </button>
            </>
          )}
        </form>

        <p className="text-center text-sm text-slate-600 mt-6">
          New here? <Link to="/signup" className="text-blue-600 underline">Sign up with email or phone</Link>
        </p>
      </div>
    </div>
  );
}
