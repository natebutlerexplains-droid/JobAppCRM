export function TermsOfService({ isOpen, onClose }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Terms of Service</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 text-2xl font-bold"
          >
            ✕
          </button>
        </div>

        <div className="p-6 text-slate-300 space-y-6">
          <section>
            <h3 className="text-lg font-bold text-white mb-3">1. Acceptance of Terms</h3>
            <p className="text-sm leading-relaxed">
              By using Pipeline, you agree to comply with these Terms of Service. If you do not agree with any part of these terms, you may not use the service.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-white mb-3">2. Service Description</h3>
            <p className="text-sm leading-relaxed">
              Pipeline is a personal job application management tool designed to help you track, organize, and manage job applications. It is provided on an "as-is" basis without warranties of any kind.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-white mb-3">3. User Responsibilities</h3>
            <p className="text-sm leading-relaxed">
              You are responsible for maintaining the confidentiality of your Google account credentials. You agree not to share your account with others. You are responsible for all activities under your account.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-white mb-3">4. Acceptable Use</h3>
            <p className="text-sm leading-relaxed">
              You agree not to:
            </p>
            <ul className="text-sm leading-relaxed list-disc list-inside mt-2 space-y-1">
              <li>Use Pipeline for illegal purposes</li>
              <li>Attempt to gain unauthorized access to the system</li>
              <li>Disrupt or interfere with the service's operation</li>
              <li>Reverse engineer or attempt to extract the source code</li>
              <li>Use automated tools to scrape or extract data</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-bold text-white mb-3">5. Intellectual Property</h3>
            <p className="text-sm leading-relaxed">
              Pipeline and its original content are owned by the developers. You retain ownership of all data you input into the application. You grant Pipeline a license to use your data solely to provide the service.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-white mb-3">6. Limitation of Liability</h3>
            <p className="text-sm leading-relaxed">
              Pipeline is provided without warranty. The developers are not liable for any damages, data loss, or consequential damages arising from your use of the service. Use at your own risk.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-white mb-3">7. Data Backup</h3>
            <p className="text-sm leading-relaxed">
              While we maintain regular backups, you are responsible for maintaining your own backups of important data. We recommend regularly exporting your application data.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-white mb-3">8. Service Availability</h3>
            <p className="text-sm leading-relaxed">
              Pipeline is provided on a best-effort basis. We do not guarantee uninterrupted service. We may modify or discontinue features at any time.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-white mb-3">9. Termination</h3>
            <p className="text-sm leading-relaxed">
              We reserve the right to terminate your access if you violate these terms. You may delete your account at any time through your account settings.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-white mb-3">10. Changes to Terms</h3>
            <p className="text-sm leading-relaxed">
              We may update these terms at any time. Continued use of Pipeline constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-white mb-3">11. Contact</h3>
            <p className="text-sm leading-relaxed">
              For questions about these terms, please contact nate.butler.clt@outlook.com
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
