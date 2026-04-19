export function PrivacyPolicy({ isOpen, onClose }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Privacy Policy</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 text-2xl font-bold"
          >
            ✕
          </button>
        </div>

        <div className="p-6 text-slate-300 space-y-6">
          <section>
            <h3 className="text-lg font-bold text-white mb-3">1. Information We Collect</h3>
            <p className="text-sm leading-relaxed">
              Pipeline collects minimal information to function. We only access and store your Google account name and email address when you sign in. We do not collect payment information, location data, or any other personal information beyond what you voluntarily provide in the application forms.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-white mb-3">2. How We Use Your Information</h3>
            <p className="text-sm leading-relaxed">
              Your information is used solely to:
            </p>
            <ul className="text-sm leading-relaxed list-disc list-inside mt-2 space-y-1">
              <li>Authenticate your account and maintain your session</li>
              <li>Store and manage your job applications and interview preparation data</li>
              <li>Display your personalized pipeline dashboard</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-bold text-white mb-3">3. Data Storage</h3>
            <p className="text-sm leading-relaxed">
              All your data is stored securely in Firebase Firestore. Your data is never shared with third parties, sold, or used for marketing purposes. You maintain full ownership and control of your data at all times.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-white mb-3">4. Data Security</h3>
            <p className="text-sm leading-relaxed">
              Pipeline uses industry-standard security measures, including encryption in transit (HTTPS/TLS) and row-level access controls in the database. Only you can access your own data through your authenticated Google account.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-white mb-3">5. Cookies and Local Storage</h3>
            <p className="text-sm leading-relaxed">
              Pipeline uses browser local storage to cache settings and application data for better performance. No tracking cookies are used. You can clear this data anytime through your browser settings.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-white mb-3">6. Email Access</h3>
            <p className="text-sm leading-relaxed">
              If you choose to connect your email account, Pipeline only accesses emails related to job applications. We do not read, store, or process any other emails. You can revoke email access at any time through your Google account settings.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-white mb-3">7. Your Rights</h3>
            <p className="text-sm leading-relaxed">
              You have the right to access, modify, or delete your data at any time. Contact support for data export requests or permanent account deletion.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-white mb-3">8. Changes to This Policy</h3>
            <p className="text-sm leading-relaxed">
              We may update this privacy policy occasionally. Continued use of Pipeline after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-white mb-3">9. Contact Us</h3>
            <p className="text-sm leading-relaxed">
              If you have questions about this privacy policy, please contact nate.butler.clt@outlook.com
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
