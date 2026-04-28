'use client';
export default function Footer() {
  return (
    <footer className="mt-24 bg-gradient-to-r from-blue-900 via-blue-800 to-purple-900 text-white py-12 px-6">
      <div className="mx-auto max-w-7xl grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Logo & Description */}
        <div className="col-span-1 md:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <img 
              src="https://play-lh.googleusercontent.com/SwRA5CRtwVlGHVg75qaZbxc6ivcJ7mVkErDDudhpZ37Vr32U_PzV1NffrnnsD9dM5g" 
              alt="Vista's Learning Logo" 
              className="w-12 h-12 object-contain rounded-lg shadow-lg"
            />
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent">
                Vista&apos;s Learning
              </h2>
              <p className="text-blue-200 text-sm">School Management System</p>
            </div>
          </div>
          <p className="text-blue-200 leading-relaxed">
            True progress begins when quality education reaches every corner of society.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="text-lg font-semibold text-blue-300 mb-4">Quick Links</h3>
          <ul className="space-y-2">
            <li><a href="/dashboard" className="text-blue-200 hover:text-white hover:underline transition-all duration-200 text-sm">Dashboard</a></li>
            <li><a href="/login" className="text-blue-200 hover:text-white hover:underline transition-all duration-200 text-sm">Login</a></li>
            <li><a href="/forgot-password" className="text-blue-200 hover:text-white hover:underline transition-all duration-200 text-sm">Forgot Password</a></li>
          </ul>
        </div>

        {/* Role Access */}
        <div>
          <h3 className="text-lg font-semibold text-blue-300 mb-4">Roles</h3>
          <ul className="space-y-2">
            <li className="text-blue-200 text-sm">• Super Admin</li>
            <li className="text-blue-200 text-sm">• School Admin</li>
            <li className="text-blue-200 text-sm">• Teacher</li>
            <li className="text-blue-200 text-sm">• Student</li>
            <li className="text-blue-200 text-sm">• Parent</li>
            <li className="text-blue-200 text-sm">• Staff</li>
          </ul>
        </div>
      </div>
      
      {/* Bottom Bar */}
      <div className="border-t border-blue-800 mt-8 pt-8">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-blue-300">
          <p>&copy; 2026 Vista&apos;s Learning. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-white transition-colors duration-200">Privacy</a>
            <a href="#" className="hover:text-white transition-colors duration-200">Terms</a>
            <a href="#" className="hover:text-white transition-colors duration-200">Support</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
