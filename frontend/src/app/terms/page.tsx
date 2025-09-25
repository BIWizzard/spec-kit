import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service - KGiQ Family Finance',
  description: 'Terms of service for KGiQ Family Finance application, including user responsibilities and service limitations.',
}

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/20 pointer-events-none"></div>

      <main className="relative z-10">
        <div className="max-w-4xl mx-auto px-4 py-12">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white mb-4">Terms of Service</h1>
            <p className="text-slate-300 text-lg">
              Terms and conditions for using KGiQ Family Finance
            </p>
            <p className="text-slate-400 text-sm mt-2">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>

          {/* Content */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8 space-y-8">

            {/* Agreement to Terms */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">1. Agreement to Terms</h2>
              <p className="text-slate-300 leading-relaxed">
                By accessing and using KGiQ Family Finance (the "Service"), you agree to be bound by these
                Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service.
                These Terms constitute a legally binding agreement between you and KGiQ Family Finance.
              </p>
            </section>

            {/* Description of Service */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">2. Description of Service</h2>
              <p className="text-slate-300 leading-relaxed mb-4">
                KGiQ Family Finance is a personal financial management application that helps families:
              </p>
              <ul className="text-slate-300 space-y-2 ml-4">
                <li>• Connect and sync bank accounts securely via Plaid</li>
                <li>• Track income events and schedule payments</li>
                <li>• Attribute payments to income sources for cash flow management</li>
                <li>• Create budgets and analyze spending patterns</li>
                <li>• Share financial data with family members</li>
                <li>• Generate financial reports and insights</li>
              </ul>
            </section>

            {/* Eligibility */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">3. Eligibility</h2>
              <p className="text-slate-300 leading-relaxed mb-4">
                To use the Service, you must:
              </p>
              <ul className="text-slate-300 space-y-2 ml-4">
                <li>• Be at least 18 years old</li>
                <li>• Have legal capacity to enter into a binding agreement</li>
                <li>• Provide accurate and complete registration information</li>
                <li>• Maintain the security of your account credentials</li>
                <li>• Use the Service only for personal, non-commercial purposes</li>
              </ul>
            </section>

            {/* User Accounts and Security */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">4. User Accounts and Security</h2>

              <h3 className="text-xl font-medium text-white mb-3">4.1 Account Creation</h3>
              <ul className="text-slate-300 space-y-2 ml-4">
                <li>• You must provide accurate and current information</li>
                <li>• Each person may maintain only one account</li>
                <li>• You are responsible for all activities under your account</li>
                <li>• Multi-factor authentication is required for security</li>
              </ul>

              <h3 className="text-xl font-medium text-white mb-3 mt-6">4.2 Account Security</h3>
              <ul className="text-slate-300 space-y-2 ml-4">
                <li>• Keep your login credentials confidential</li>
                <li>• Notify us immediately of any unauthorized access</li>
                <li>• Use strong, unique passwords</li>
                <li>• Do not share your account with others</li>
                <li>• Log out of shared or public computers</li>
              </ul>

              <h3 className="text-xl font-medium text-white mb-3 mt-6">4.3 Family Sharing</h3>
              <ul className="text-slate-300 space-y-2 ml-4">
                <li>• Only invite trusted family members</li>
                <li>• Set appropriate permission levels</li>
                <li>• Monitor family member activities</li>
                <li>• You remain responsible for all account activity</li>
              </ul>
            </section>

            {/* Banking and Financial Data */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">5. Banking and Financial Data</h2>

              <h3 className="text-xl font-medium text-white mb-3">5.1 Bank Account Connections</h3>
              <ul className="text-slate-300 space-y-2 ml-4">
                <li>• Bank connections are managed securely through Plaid</li>
                <li>• We have read-only access to your account information</li>
                <li>• We cannot initiate transactions or move money</li>
                <li>• You can disconnect bank accounts at any time</li>
                <li>• We do not store your banking credentials</li>
              </ul>

              <h3 className="text-xl font-medium text-white mb-3 mt-6">5.2 Data Accuracy</h3>
              <ul className="text-slate-300 space-y-2 ml-4">
                <li>• Financial data is provided by your banks via Plaid</li>
                <li>• We do not guarantee the accuracy of imported data</li>
                <li>• You should verify important financial information</li>
                <li>• Report any data discrepancies promptly</li>
                <li>• Manual corrections and categorizations are your responsibility</li>
              </ul>

              <h3 className="text-xl font-medium text-white mb-3 mt-6">5.3 Financial Advice Disclaimer</h3>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                <p className="text-amber-200 font-medium mb-2">Important Notice:</p>
                <p className="text-slate-300 text-sm">
                  The Service provides financial organization tools and basic insights but does not
                  constitute financial advice. Consult qualified financial professionals for investment,
                  tax, or other financial decisions.
                </p>
              </div>
            </section>

            {/* Acceptable Use */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">6. Acceptable Use</h2>

              <h3 className="text-xl font-medium text-white mb-3">6.1 Permitted Uses</h3>
              <ul className="text-slate-300 space-y-2 ml-4">
                <li>• Personal financial management and budgeting</li>
                <li>• Family financial planning and coordination</li>
                <li>• Transaction categorization and analysis</li>
                <li>• Cash flow planning and income attribution</li>
                <li>• Financial reporting and data export</li>
              </ul>

              <h3 className="text-xl font-medium text-white mb-3 mt-6">6.2 Prohibited Uses</h3>
              <ul className="text-slate-300 space-y-2 ml-4">
                <li>• Commercial or business financial management</li>
                <li>• Sharing access with non-family members</li>
                <li>• Attempting to reverse engineer the Service</li>
                <li>• Using automated tools to access data excessively</li>
                <li>• Violating any applicable laws or regulations</li>
                <li>• Interfering with the Service's security features</li>
              </ul>
            </section>

            {/* Data Ownership and Export */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">7. Data Ownership and Export</h2>

              <h3 className="text-xl font-medium text-white mb-3">7.1 Your Data Rights</h3>
              <ul className="text-slate-300 space-y-2 ml-4">
                <li>• You own all your financial and personal data</li>
                <li>• Export your data at any time in CSV format</li>
                <li>• Delete individual transactions or entire datasets</li>
                <li>• Request complete account deletion</li>
                <li>• Data portability to other financial tools</li>
              </ul>

              <h3 className="text-xl font-medium text-white mb-3 mt-6">7.2 Data Retention</h3>
              <ul className="text-slate-300 space-y-2 ml-4">
                <li>• Financial data retained indefinitely while account is active</li>
                <li>• Deleted account data anonymized after 30 days</li>
                <li>• Audit logs retained for security purposes (7 years)</li>
                <li>• Bank connection data deleted immediately upon disconnection</li>
              </ul>
            </section>

            {/* Service Availability */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">8. Service Availability</h2>

              <h3 className="text-xl font-medium text-white mb-3">8.1 Uptime and Maintenance</h3>
              <ul className="text-slate-300 space-y-2 ml-4">
                <li>• We strive for 99.9% uptime but do not guarantee availability</li>
                <li>• Scheduled maintenance will be announced in advance</li>
                <li>• Emergency maintenance may occur without notice</li>
                <li>• Third-party service outages may affect functionality</li>
              </ul>

              <h3 className="text-xl font-medium text-white mb-3 mt-6">8.2 Service Modifications</h3>
              <p className="text-slate-300 leading-relaxed">
                We may modify, suspend, or discontinue the Service at any time. We will provide
                reasonable notice for significant changes. If we discontinue the Service, we will
                provide tools to export your data.
              </p>
            </section>

            {/* Intellectual Property */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">9. Intellectual Property</h2>

              <h3 className="text-xl font-medium text-white mb-3">9.1 Our Rights</h3>
              <ul className="text-slate-300 space-y-2 ml-4">
                <li>• All Service software, design, and content are our property</li>
                <li>• KGiQ trademarks and branding are protected</li>
                <li>• You may not copy, modify, or distribute our software</li>
                <li>• Screenshots for personal use are permitted</li>
              </ul>

              <h3 className="text-xl font-medium text-white mb-3 mt-6">9.2 Your Rights</h3>
              <ul className="text-slate-300 space-y-2 ml-4">
                <li>• Limited license to use the Service for intended purposes</li>
                <li>• Right to export and use your own data</li>
                <li>• License terminates when account is closed</li>
              </ul>
            </section>

            {/* Privacy and Third-Party Services */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">10. Privacy and Third-Party Services</h2>

              <h3 className="text-xl font-medium text-white mb-3">10.1 Privacy Policy</h3>
              <p className="text-slate-300 leading-relaxed mb-4">
                Your privacy is important to us. Please review our{' '}
                <a href="/privacy" className="text-[#FFD166] hover:text-[#FFD166]/80 underline">
                  Privacy Policy
                </a>{' '}
                to understand how we collect, use, and protect your information.
              </p>

              <h3 className="text-xl font-medium text-white mb-3">10.2 Third-Party Services</h3>
              <ul className="text-slate-300 space-y-2 ml-4">
                <li>• <strong>Plaid:</strong> Bank data aggregation (subject to Plaid's terms)</li>
                <li>• <strong>Vercel:</strong> Application hosting and performance</li>
                <li>• <strong>Neon:</strong> Database hosting and management</li>
                <li>• <strong>Supabase:</strong> Authentication services</li>
                <li>• <strong>Resend:</strong> Email delivery services</li>
              </ul>
            </section>

            {/* Limitation of Liability */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">11. Limitation of Liability</h2>

              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
                <p className="text-red-200 font-medium mb-2">Important Legal Notice:</p>
                <p className="text-slate-300 text-sm">
                  The Service is provided "as is" without warranties of any kind.
                  We are not liable for financial decisions made based on information from our Service.
                </p>
              </div>

              <h3 className="text-xl font-medium text-white mb-3">11.1 Disclaimers</h3>
              <ul className="text-slate-300 space-y-2 ml-4">
                <li>• No warranty of data accuracy or completeness</li>
                <li>• No guarantee of continuous service availability</li>
                <li>• Not responsible for third-party service failures</li>
                <li>• No liability for financial losses or missed payments</li>
                <li>• User responsible for verifying important financial data</li>
              </ul>

              <h3 className="text-xl font-medium text-white mb-3 mt-6">11.2 Maximum Liability</h3>
              <p className="text-slate-300 leading-relaxed">
                Our total liability to you for all claims related to the Service shall not exceed
                the amount you paid for the Service in the 12 months preceding the claim.
              </p>
            </section>

            {/* Indemnification */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">12. Indemnification</h2>
              <p className="text-slate-300 leading-relaxed">
                You agree to indemnify and hold us harmless from any claims, damages, or expenses
                arising from your use of the Service, violation of these Terms, or infringement
                of any rights of another party.
              </p>
            </section>

            {/* Termination */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">13. Termination</h2>

              <h3 className="text-xl font-medium text-white mb-3">13.1 Termination by You</h3>
              <ul className="text-slate-300 space-y-2 ml-4">
                <li>• Close your account at any time through account settings</li>
                <li>• Export your data before closing your account</li>
                <li>• Disconnect bank accounts before termination</li>
              </ul>

              <h3 className="text-xl font-medium text-white mb-3 mt-6">13.2 Termination by Us</h3>
              <ul className="text-slate-300 space-y-2 ml-4">
                <li>• We may terminate accounts for Terms violations</li>
                <li>• We may suspend Service for maintenance or legal reasons</li>
                <li>• Reasonable notice will be provided when possible</li>
                <li>• You will have opportunity to export data before termination</li>
              </ul>
            </section>

            {/* Governing Law */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">14. Governing Law</h2>
              <p className="text-slate-300 leading-relaxed">
                These Terms are governed by the laws of the United States without regard to conflict
                of law principles. Any disputes will be resolved through binding arbitration or
                in courts of competent jurisdiction in the United States.
              </p>
            </section>

            {/* Changes to Terms */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">15. Changes to Terms</h2>
              <p className="text-slate-300 leading-relaxed">
                We may update these Terms periodically. Significant changes will be communicated
                via email or through the Service. Continued use after changes indicates acceptance
                of the updated Terms.
              </p>
            </section>

            {/* Contact Information */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">16. Contact Information</h2>
              <p className="text-slate-300 leading-relaxed mb-4">
                For questions about these Terms of Service, please contact us:
              </p>
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <p className="text-white font-medium">KGiQ Family Finance</p>
                <p className="text-slate-300">Email: support@kmghub.com</p>
                <p className="text-slate-300">Website: https://budget.kmghub.com</p>
              </div>
            </section>

            {/* Severability */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">17. Severability</h2>
              <p className="text-slate-300 leading-relaxed">
                If any provision of these Terms is found to be unenforceable, the remaining
                provisions will continue in full force and effect.
              </p>
            </section>

          </div>

          {/* Footer */}
          <div className="text-center mt-12">
            <p className="text-slate-400 text-sm">
              These terms of service meet Plaid's requirements for production access
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}