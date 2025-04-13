"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { isAddress } from "viem";
import { ErrorBoundary } from './ErrorBoundary';
import { toast } from 'sonner';

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
    telegramUsername: "",
    platformUsername: "",
    walletAddress: "",
    discordUsername: "",
    email: "",
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  // Add field-specific validation functions
  const validateTelegramUsername = (value: string): string | null => {
    if (!value) return "Telegram username is required";
    if (!value.startsWith('@')) return "Telegram username must start with '@'";
    if (!/^@[a-zA-Z0-9_]+$/.test(value)) return "Telegram username can only contain letters, numbers, and underscores after the '@'";
    if (value.length > 32) return "Telegram username is too long";
    return null;
  };

  const validatePlatformUsername = (value: string): string | null => {
    if (!value) return "Platform username is required";
    
    // Match the validation logic from the API endpoint
    const hasSpecialChars = /[^a-zA-Z0-9_\.]/.test(value);
    const isInvalidLength = value.length < 3 || value.length > 20;
    const startsWithNumber = /^[0-9]/.test(value);
    
    if (hasSpecialChars) return "Username can only contain letters, numbers, underscores, and dots";
    if (isInvalidLength) return "Username must be between 3 and 20 characters";
    if (startsWithNumber) return "Username cannot start with a number";
    
    return null;
  };

  const validateWalletAddress = (value: string): string | null => {
    if (!value) return "Wallet address is required";
    if (!isAddress(value)) return "Invalid Ethereum wallet address";
    return null;
  };

  const validateDiscordUsername = (value: string): string | null => {
    if (!value) return null; // Optional field
    if (!/^[a-zA-Z0-9_#]+$/.test(value)) return "Discord username can only contain letters, numbers, underscores, and #";
    if (value.length > 32) return "Discord username is too long";
    return null;
  };

  const validateEmail = (value: string): string | null => {
    if (!value) return "Email is required";
    
    // Basic email format validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return "Invalid email address";
    }
    
    // Check for minimum 2 characters in the domain extension
    const domainPart = value.split('@')[1];
    const extension = domainPart.split('.').pop();
    
    if (!extension || extension.length < 2) {
      return "Email domain extension must be at least 2 characters";
    }
    
    if (value.length > 254) return "Email address is too long";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    setIsSubmitting(true);
    setIsValidating(true);

    try {
      // First validate platform username
      const validationResponse = await fetch("/api/validate-platform-username", {
        method: "POST",
        body: JSON.stringify({ username: formData.platformUsername }),
      });

      const validationData = await validationResponse.json();
      setIsValidating(false);

      if (!validationResponse.ok || !validationData.isValid) {
        setSubmitError("Invalid platform username. Please check the format and try again.");
        setIsSubmitting(false);
        return;
      }

      // If validation passes, submit the entry
      const response = await fetch("/api/entries", {
        method: "POST",
        body: JSON.stringify({
          ...formData,
          topicId,
          topicName
        }),
        headers: {
          "Content-Type": "application/json",
        }
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        setSubmitError(data.error || "Failed to submit entry");
        return;
      }

      setIsSuccess(true);
      toast.success("Entry submitted successfully!");
      // Reset form after successful submission
      setFormData({
        telegramUsername: "",
        platformUsername: "",
        walletAddress: "",
        discordUsername: "",
        email: "",
      });
    } catch (error) {
      setSubmitError("An unexpected error occurred");
      toast.error("Failed to submit entry");
    } finally {
      setIsSubmitting(false);
      setIsValidating(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let error: string | null = null;
    
    // Validate the field that lost focus
    switch (name) {
      case 'telegramUsername':
        error = validateTelegramUsername(value);
        break;
      case 'platformUsername':
        error = validatePlatformUsername(value);
        break;
      case 'walletAddress':
        error = validateWalletAddress(value);
        break;
      case 'discordUsername':
        error = validateDiscordUsername(value);
        break;
      case 'email':
        error = validateEmail(value);
        break;
    }
    
    // Update errors state with the validation result
    setErrors(prev => ({
      ...prev,
      [name]: error || ''
    }));
  };

  if (isSuccess) {
    return (
      <ErrorBoundary>
        <div className="bg-green-50 border border-green-200 rounded p-4 mb-4">
          <h2 className="text-green-800 font-semibold">
            Entry Submitted Successfully!
          </h2>
          <p className="text-green-700">
            Thank you for your submission for {topicName}.
          </p>
          <button
            onClick={() => router.push("/")}
            className="mt-4 text-green-600 hover:text-green-800 underline"
          >
            Return to Topics
          </button>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
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
            onBlur={handleBlur}
            className={`w-full p-2 border rounded ${
              errors.telegramUsername ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="@username"
            autoComplete="off"
            disabled={isSubmitting || isValidating}
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
            onBlur={handleBlur}
            className={`w-full p-2 border rounded ${
              errors.platformUsername ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="username"
            autoComplete="off"
            disabled={isSubmitting || isValidating}
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
            onBlur={handleBlur}
            className={`w-full p-2 border rounded ${
              errors.walletAddress ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="0x1234...1234"
            autoComplete="off"
            disabled={isSubmitting || isValidating}
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
            onBlur={handleBlur}
            className={`w-full p-2 border rounded ${
              errors.discordUsername ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="username#1234"
            autoComplete="off"
            disabled={isSubmitting || isValidating}
          />
          {errors.discordUsername && (
            <p className="mt-1 text-sm text-red-600">{errors.discordUsername}</p>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`w-full p-2 border rounded ${
              errors.email ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="your@email.com"
            autoComplete="off"
            disabled={isSubmitting || isValidating}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || isValidating}
          className={`w-full py-2 px-4 rounded-md text-white font-medium transition-all
            ${
              isSubmitting || isValidating
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 active:transform active:scale-95"
            }`}
        >
          {isValidating ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Validating...
            </span>
          ) : isSubmitting ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Submitting...
            </span>
          ) : (
            "Submit Entry"
          )}
        </button>
      </form>
    </ErrorBoundary>
  );
}
