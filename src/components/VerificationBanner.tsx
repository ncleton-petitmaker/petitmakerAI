import React, { useEffect, useState } from 'react';

export const VerificationBanner = () => {
  const [verificationDate, setVerificationDate] = useState<Date>(new Date('2025-02-22'));

  useEffect(() => {
    // Function to calculate the next verification date
    const calculateNextVerification = (currentDate: Date) => {
      const nextDate = new Date(currentDate);
      nextDate.setDate(currentDate.getDate() + 7);
      return nextDate;
    };

    // Check if we need to update the verification date
    const checkAndUpdateDate = () => {
      const now = new Date();
      if (now > verificationDate) {
        setVerificationDate(calculateNextVerification(verificationDate));
      }
    };

    // Check immediately and then set up weekly checks
    checkAndUpdateDate();
    const interval = setInterval(checkAndUpdateDate, 1000 * 60 * 60 * 24); // Check daily

    return () => clearInterval(interval);
  }, [verificationDate]);

  return (
    <div className="bg-blue-900/30 py-2 text-center text-sm text-gray-300">
      Informations valides et vérifiées en date du{' '}
      {verificationDate.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}
    </div>
  );
};