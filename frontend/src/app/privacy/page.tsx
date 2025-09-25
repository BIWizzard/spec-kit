import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy - KGiQ Family Finance',
  description: 'Privacy policy for KGiQ Family Finance application, including bank data handling and user privacy protection.',
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/20 pointer-events-none"></div>

      <main className="relative z-10">
        <div className="max-w-4xl mx-auto px-4 py-12">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white mb-4">Privacy Policy</h1>
            <p className="text-slate-300 text-lg">
              How KGiQ Family Finance protects your financial data
            </p>
            <p className="text-slate-400 text-sm mt-2">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>

          {/* Content */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8 space-y-8">

            {/* Introduction */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">1. Introduction</h2>
              <p className="text-slate-300 leading-relaxed">
                KGiQ Family Finance ("we," "our," or "us") is committed to protecting your privacy and financial data.
                This Privacy Policy explains how we collect, use, protect, and share information when you use our
                family financial management application (the "Service").
              </p>
            </section>

            {/* Information We Collect */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">2. Information We Collect</h2>

              <h3 className="text-xl font-medium text-white mb-3">2.1 Account Information</h3>
              <ul className="text-slate-300 space-y-2 ml-4">
                <li>• Email address and password (encrypted)</li>
                <li>• Family name and member information</li>
                <li>• Profile settings and preferences</li>
                <li>• Multi-factor authentication data</li>
              </ul>

              <h3 className="text-xl font-medium text-white mb-3 mt-6">2.2 Financial Data (via Plaid)</h3>
              <ul className="text-slate-300 space-y-2 ml-4">
                <li>• Bank account information (account numbers, balances)</li>
                <li>• Transaction history and descriptions</li>
                <li>• Account holder names and institution details</li>
                <li>• Account types (checking, savings, credit, etc.)</li>
              </ul>

              <h3 className="text-xl font-medium text-white mb-3 mt-6">2.3 Usage Information</h3>
              <ul className="text-slate-300 space-y-2 ml-4">
                <li>• Income events, payment schedules, and budget categories</li>
                <li>• Transaction categorizations and custom spending categories</li>
                <li>• Report preferences and export requests</li>
                <li>• Application usage patterns and feature interactions</li>
              </ul>
            </section>

            {/* How We Use Your Information */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">3. How We Use Your Information</h2>

              <h3 className="text-xl font-medium text-white mb-3">3.1 Service Provision</h3>
              <ul className="text-slate-300 space-y-2 ml-4">
                <li>• Synchronize and display your bank account data</li>
                <li>• Categorize transactions and analyze spending patterns</li>
                <li>• Calculate cash flow, budgets, and financial insights</li>
                <li>• Generate reports and export financial data</li>
                <li>• Enable family member data sharing with appropriate permissions</li>
              </ul>

              <h3 className="text-xl font-medium text-white mb-3 mt-6">3.2 Security and Authentication</h3>
              <ul className="text-slate-300 space-y-2 ml-4">
                <li>• Verify your identity and maintain secure sessions</li>
                <li>• Detect and prevent fraudulent activities</li>
                <li>• Send security notifications and alerts</li>
                <li>• Maintain audit logs for security monitoring</li>
              </ul>

              <h3 className="text-xl font-medium text-white mb-3 mt-6">3.3 Communication</h3>
              <ul className="text-slate-300 space-y-2 ml-4">
                <li>• Send service-related notifications and updates</li>
                <li>• Respond to support requests and inquiries</li>
                <li>• Notify about account or security issues</li>
              </ul>
            </section>

            {/* Data Protection */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">4. Data Protection and Security</h2>

              <h3 className="text-xl font-medium text-white mb-3">4.1 Encryption and Security</h3>
              <ul className="text-slate-300 space-y-2 ml-4">
                <li>• All data transmitted using TLS 1.3 encryption</li>
                <li>• Data at rest encrypted using AES-256 encryption</li>
                <li>• Bank-grade security headers and HTTPS enforcement</li>
                <li>• Multi-factor authentication required for account access</li>
                <li>• Regular security audits and vulnerability assessments</li>
              </ul>

              <h3 className="text-xl font-medium text-white mb-3 mt-6">4.2 Banking Data Security</h3>
              <ul className="text-slate-300 space-y-2 ml-4">
                <li>• Bank connections managed by Plaid (SOC 2 Type II certified)</li>
                <li>• We never store your banking credentials</li>
                <li>• Bank account tokens securely encrypted and stored</li>
                <li>• Read-only access to account data (no ability to initiate transactions)</li>
              </ul>

              <h3 className="text-xl font-medium text-white mb-3 mt-6">4.3 Access Controls</h3>
              <ul className="text-slate-300 space-y-2 ml-4">
                <li>• Role-based access control for family members</li>
                <li>• Session management with automatic timeout</li>
                <li>• Comprehensive audit logging of all data access</li>
                <li>• Regular access reviews and permission updates</li>
              </ul>
            </section>

            {/* Data Sharing */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">5. Data Sharing and Disclosure</h2>

              <h3 className="text-xl font-medium text-white mb-3">5.1 We Do Not Sell Your Data</h3>
              <p className="text-slate-300 leading-relaxed mb-4">
                We do not sell, rent, or trade your personal or financial information to third parties
                for marketing purposes.
              </p>

              <h3 className="text-xl font-medium text-white mb-3">5.2 Service Providers</h3>
              <ul className="text-slate-300 space-y-2 ml-4">
                <li>• <strong>Plaid:</strong> Bank data aggregation and authentication</li>
                <li>• <strong>Neon:</strong> Database hosting and management</li>
                <li>• <strong>Vercel:</strong> Application hosting and content delivery</li>
                <li>• <strong>Supabase:</strong> User authentication services</li>
                <li>• <strong>Resend:</strong> Transactional email delivery</li>
              </ul>

              <h3 className="text-xl font-medium text-white mb-3 mt-6">5.3 Family Member Sharing</h3>
              <ul className="text-slate-300 space-y-2 ml-4">
                <li>• Financial data shared only with invited family members</li>
                <li>• Role-based permissions control data access levels</li>
                <li>• Family members can be removed at any time</li>
                <li>• All sharing activities are logged and auditable</li>
              </ul>

              <h3 className="text-xl font-medium text-white mb-3 mt-6">5.4 Legal Requirements</h3>
              <p className="text-slate-300 leading-relaxed">
                We may disclose information if required by law, court order, or government request,
                or to protect our rights, property, or safety, or that of our users or the public.
              </p>
            </section>

            {/* Data Retention */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">6. Data Retention</h2>
              <ul className="text-slate-300 space-y-2 ml-4">
                <li>• Financial transaction data: Retained indefinitely as requested by users</li>
                <li>• Account information: Retained while account is active</li>
                <li>• Audit logs: Retained for 7 years for security and compliance</li>
                <li>• Deleted account data: Anonymized after 30 days</li>
                <li>• Bank connection tokens: Deleted immediately upon disconnection</li>
              </ul>
            </section>

            {/* User Rights */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">7. Your Rights and Choices</h2>

              <h3 className="text-xl font-medium text-white mb-3">7.1 Access and Control</h3>
              <ul className="text-slate-300 space-y-2 ml-4">
                <li>• View and update your account information at any time</li>
                <li>• Export your financial data in CSV format</li>
                <li>• Delete individual transactions or entire data sets</li>
                <li>• Disconnect bank accounts and remove data</li>
                <li>• Close your account and request data deletion</li>
              </ul>

              <h3 className="text-xl font-medium text-white mb-3 mt-6">7.2 Communication Preferences</h3>
              <ul className="text-slate-300 space-y-2 ml-4">
                <li>• Opt out of non-essential email notifications</li>
                <li>• Control alert frequency and types</li>
                <li>• Update contact preferences in account settings</li>
              </ul>
            </section>

            {/* Cookies and Tracking */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">8. Cookies and Tracking</h2>
              <p className="text-slate-300 leading-relaxed mb-4">
                We use essential cookies for authentication and session management. We use Vercel Analytics
                for basic performance monitoring, which collects anonymous usage statistics.
              </p>
              <ul className="text-slate-300 space-y-2 ml-4">
                <li>• Essential cookies: Required for login and security</li>
                <li>• Analytics cookies: Anonymous performance data only</li>
                <li>• No advertising or tracking cookies</li>
                <li>• No third-party marketing pixels</li>
              </ul>
            </section>

            {/* International Users */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">9. International Users</h2>
              <p className="text-slate-300 leading-relaxed">
                Our services are hosted in the United States. If you access our services from outside
                the US, your information may be transferred to, stored, and processed in the US.
                We maintain appropriate safeguards for international data transfers.
              </p>
            </section>

            {/* Children's Privacy */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">10. Children's Privacy</h2>
              <p className="text-slate-300 leading-relaxed">
                Our Service is not intended for children under 18 years of age. We do not knowingly
                collect personal information from children under 18. If we learn that we have collected
                information from a child under 18, we will delete it promptly.
              </p>
            </section>

            {/* Changes to Policy */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">11. Changes to This Policy</h2>
              <p className="text-slate-300 leading-relaxed">
                We may update this Privacy Policy periodically. We will notify you of significant
                changes by email or through our Service. Your continued use of the Service after
                changes indicates your acceptance of the updated policy.
              </p>
            </section>

            {/* Contact Information */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">12. Contact Us</h2>
              <p className="text-slate-300 leading-relaxed mb-4">
                If you have questions about this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <p className="text-white font-medium">KGiQ Family Finance</p>
                <p className="text-slate-300">Email: privacy@kmghub.com</p>
                <p className="text-slate-300">Website: https://budget.kmghub.com</p>
              </div>
            </section>

          </div>

          {/* Footer */}
          <div className="text-center mt-12">
            <p className="text-slate-400 text-sm">
              This privacy policy ensures compliance with Plaid's requirements for production access
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}