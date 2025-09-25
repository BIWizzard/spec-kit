import Link from 'next/link';

export const metadata = {
  title: 'KGiQ Family Finance - Smart Cash Flow Management',
  description: 'Take control of your family finances with intelligent paycheck-to-paycheck cash flow management, budget allocation, and bank integration.',
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold text-white mb-6">
            KGiQ <span className="text-yellow-400">Family Finance</span>
          </h1>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Take control of your family's financial future with intelligent paycheck-to-paycheck
            cash flow management, budget allocation, and bank integration.
          </p>
        </div>

        {/* Navigation Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Link href="/login" className="group">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 text-center hover:bg-white/15 transition-all duration-300 group-hover:scale-105">
              <h4 className="text-lg font-semibold text-white mb-2">Sign In</h4>
              <p className="text-slate-300 text-sm">Access your account</p>
            </div>
          </Link>

          <Link href="/register" className="group">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 text-center hover:bg-white/15 transition-all duration-300 group-hover:scale-105">
              <h4 className="text-lg font-semibold text-white mb-2">Get Started</h4>
              <p className="text-slate-300 text-sm">Create new account</p>
            </div>
          </Link>

          <Link href="/dashboard" className="group">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 text-center hover:bg-white/15 transition-all duration-300 group-hover:scale-105">
              <h4 className="text-lg font-semibold text-white mb-2">Dashboard</h4>
              <p className="text-slate-300 text-sm">Financial overview</p>
            </div>
          </Link>

          <Link href="/income" className="group">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 text-center hover:bg-white/15 transition-all duration-300 group-hover:scale-105">
              <h4 className="text-lg font-semibold text-white mb-2">Income</h4>
              <p className="text-slate-300 text-sm">Manage income events</p>
            </div>
          </Link>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-6">Ready to Take Control?</h2>
          <div className="flex justify-center gap-4">
            <Link href="/register" className="bg-yellow-400 text-black px-8 py-4 rounded-lg font-semibold hover:bg-yellow-300 transition-colors duration-300">
              Start Free Trial
            </Link>
            <Link href="/login" className="border border-white/30 text-white px-8 py-4 rounded-lg font-semibold hover:bg-white/10 transition-colors duration-300">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}