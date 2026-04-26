const documents = {
  terms: {
    title: 'Terms of Service',
    updatedAt: 'April 25, 2026',
    sections: [
      {
        heading: '1. Eligibility',
        body:
          'Suyavaraa is intended for adults only. By creating an account, you confirm that you are at least 18 years old and legally permitted to use matchmaking and social communication services in your region.',
      },
      {
        heading: '2. Account Rules',
        body:
          'You must provide accurate profile information, keep your login credentials secure, and use only your own account. Fake identities, impersonation, and deceptive activity are prohibited.',
      },
      {
        heading: '3. Community Safety',
        body:
          'Harassment, hate speech, sexual exploitation, scams, child safety violations, non-consensual intimate content, deepfakes intended to deceive, and requests for money or sensitive personal data are prohibited. We may moderate, restrict, suspend, or remove content or accounts that create safety risk.',
      },
      {
        heading: '4. User Content',
        body:
          'You are responsible for the photos, messages, profile details, and posts you upload. You grant Suyavaraa a limited license to host, display, and process this content to operate the service and enforce safety rules.',
      },
      {
        heading: '5. Reporting and Blocking',
        body:
          'Users can report profiles, posts, or chats and can block other members. We review safety reports and may take action including warnings, content removal, verification review, or account suspension.',
      },
      {
        heading: '6. Premium and Payments',
        body:
          'Premium features may be offered in the future. Any paid plan or digital upgrade will only be activated through a compliant billing flow available in the relevant platform and region at the time of purchase.',
      },
      {
        heading: '7. Account Deletion',
        body:
          'You may request account deletion from the app settings. Certain records may be retained for fraud prevention, legal compliance, dispute handling, and safety investigations as required by law.',
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    updatedAt: 'April 25, 2026',
    sections: [
      {
        heading: '1. Data We Collect',
        body:
          'Suyavaraa collects account details such as email address, profile information, uploaded photos or videos, messages and interaction metadata, trust and verification signals, notification tokens, and support or safety reports you submit.',
      },
      {
        heading: '2. How We Use Data',
        body:
          'We use your data to create and secure your account, operate matching and messaging features, verify authenticity, moderate safety risks, investigate abuse, provide support, and improve app performance.',
      },
      {
        heading: '3. Sensitive and Safety Data',
        body:
          'Profile media, verification submissions, moderation outcomes, and safety reports may be processed to detect impersonation, deepfakes, harassment, fraud, sexual content violations, or other risks. Access to safety data is limited to authorized systems and reviewers.',
      },
      {
        heading: '4. Data Sharing',
        body:
          'We share data only with infrastructure and service providers needed to run the app, such as authentication, database, storage, notifications, and safety tooling. We may also disclose information when required by law or to address safety threats.',
      },
      {
        heading: '5. Retention and Deletion',
        body:
          'We retain account and transaction-related records only as long as necessary for service delivery, legal obligations, fraud prevention, and safety review. When deletion is requested, user-facing data is removed or anonymized unless retention is required for these purposes.',
      },
      {
        heading: '6. User Controls',
        body:
          'You can edit profile data, block users, submit safety reports, request password reset, and request account deletion from the app. Support and safety requests can be submitted through the in-app support flows.',
      },
    ],
  },
  refunds: {
    title: 'Cancellation & Refund Policy',
    updatedAt: 'April 25, 2026',
    sections: [
      {
        heading: '1. Current Status',
        body:
          'Premium purchases are temporarily disabled while billing and compliance review are completed. No paid digital plan is currently processed inside the app.',
      },
      {
        heading: '2. Future Billing',
        body:
          'If subscriptions or one-time digital upgrades are introduced later, plan details, renewal terms, and cancellation steps will be shown clearly before purchase and inside the app settings.',
      },
      {
        heading: '3. Refund Handling',
        body:
          'Refund eligibility will follow the payment channel used for the transaction, applicable platform policies, and local law. Support instructions will be displayed in-app and on the public policy pages before any paid plan goes live.',
      },
    ],
  },
};

const support = {
  title: 'Support & Safety',
  updatedAt: 'April 25, 2026',
  sections: [
    {
      heading: 'In-App Help',
      body:
        'Use Settings > Support to send product feedback or a safety concern. Reports are routed to the moderation queue for review.',
    },
    {
      heading: 'User Safety',
      body:
        'Profiles, posts, and chats can be reported. Members can also be blocked. Safety tooling may flag harassment, scams, sexual coercion, deceptive media, and other harmful behavior for review.',
    },
    {
      heading: 'Child Safety',
      body:
        'Suyavaraa is for adults only. Content involving child sexual abuse or exploitation is prohibited and will be removed immediately, with escalated action taken on the associated account.',
    },
    {
      heading: 'Response Scope',
      body:
        'We prioritize reports involving impersonation, financial fraud, sexual exploitation, child safety, threats, and non-consensual or deceptive media.',
    },
  ],
};

module.exports = {
  documents,
  support,
};
