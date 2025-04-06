'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAddress } from 'viem';

interface EntryFormProps {
  topicId: string;
  topicName: string;
}

interface FormData {
  telegramUsername: string;
  platformUsername: string;
  walletAddress: string;
  discordUsername: string;
  email: string;
}

interface ValidationErrors {
  [key: string]: string;
}

export default function EntryForm({ topicId, topicName }: EntryFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    telegramUsername: '',
    platformUsername: '',
    walletAddress: '',
    discordUsername: '',
    email: '',
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    // Telegram username validation
    if (!formData.telegramUsername) {
      newErrors.telegramUsername = 'Telegram username is required';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.telegramUsername)) {
      newErrors.telegramUsername = 'Telegram username can only contain letters, numbers, and underscores';
    } else if (formData.telegramUsername.length > 32) {
      newErrors.telegramUsername = 'Telegram username is too long';
    }

    // Platform username validation
    if (!formData.platformUsername) {
      newErrors.platformUsername = 'Platform username is required';
    } else if (formData.platformUsername.length > 50) {
      newErrors.platformUsername = 'Platform username is too long';
    }

    // Wallet address validation
    if (!formData.walletAddress) {
      newErrors.walletAddress = 'Wallet address is required';
    } else if (!isAddress(formData.walletAddress)) {
      newErrors.walletAddress = 'Invalid Ethereum wallet address';
    }

    // Discord username validation (optional)
    if (formData.discordUsername) {
      if (!/^[a-zA-Z0-9_]+$/.test(formData.discordUsername)) {
        newErrors.discordUsername = 'Discord username can only contain letters, numbers, and underscores';
      } else if (formData.discordUsername.length > 32) {
        newErrors.discordUsername = 'Discord username is too long';
      }
    }

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    } else if (formData.email.length > 254) {
      newErrors.email = 'Email address is too long';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          topicId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit entry');
      }

      setIsSuccess(true);
      // Reset form after successful submission
      setFormData({
        telegramUsername: '',
        platformUsername: '',
        walletAddress: '',
        discordUsername: '',
        email: '',
      });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  if (isSuccess) {
    return (
      <div className="bg-green-50 border border-green-200 rounded p-4 mb-4">
        <h2 className="text-green-800 font-semibold">Entry Submitted Successfully!</h2>
        <p className="text-green-700">Thank you for your submission for {topicName}.</p>
        <button
          onClick={() => router.push('/')}
          className="mt-4 text-green-600 hover:text-green-800 underline"
        >
          Return to Topics
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg">
      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
          <p className="text-red-800">{submitError}</p>
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Telegram Username
        </label>
        <input
          type="text"
          name="telegramUsername"
          value={formData.telegramUsername}
          onChange={handleChange}
          className={`w-full p-2 border rounded ${
            errors.telegramUsername ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="@username"
        />
        {errors.telegramUsername && (
          <p className="mt-1 text-sm text-red-600">{errors.telegramUsername}</p>
        )}
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Platform Username
        </label>
        <input
          type="text"
          name="platformUsername"
          value={formData.platformUsername}
          onChange={handleChange}
          className={`w-full p-2 border rounded ${
            errors.platformUsername ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.platformUsername && (
          <p className="mt-1 text-sm text-red-600">{errors.platformUsername}</p>
        )}
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Wallet Address
        </label>
        <input
          type="text"
          name="walletAddress"
          value={formData.walletAddress}
          onChange={handleChange}
          className={`w-full p-2 border rounded ${
            errors.walletAddress ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="0x..."
        />
        {errors.walletAddress && (
          <p className="mt-1 text-sm text-red-600">{errors.walletAddress}</p>
        )}
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Discord Username (Optional)
        </label>
        <input
          type="text"
          name="discordUsername"
          value={formData.discordUsername}
          onChange={handleChange}
          className={`w-full p-2 border rounded ${
            errors.discordUsername ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.discordUsername && (
          <p className="mt-1 text-sm text-red-600">{errors.discordUsername}</p>
        )}
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className={`w-full p-2 border rounded ${
            errors.email ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className={`w-full bg-blue-500 text-white py-2 px-4 rounded ${
          isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
        }`}
      >
        {isSubmitting ? 'Submitting...' : 'Submit Entry'}
      </button>
    </form>
  );
} 