import { Bell, Home, Menu, MessageCircle, Search, User, X } from 'lucide-react';
import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

const Layout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();

    const menuItems = [
        { path: "/", label: "IDOC Agent", icon: <Home size={20} /> },
        // { path: "/demo2", label: "Demo2", icon: <MessageCircle size={20} /> },

    ];

   const handleMenuClick = () => {
        setSidebarOpen(false);
    };

    return (
        <div className="flex h-screen bg-gray-100">
            <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
                <div className="flex items-center justify-between p-[14px] border-b border-gray-200">
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-sm">A</span>
                        </div>
                        <span className="text-xl font-semibold text-gray-800">Agent</span>
                    </div>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                    >
                        <X size={20} />
                    </button>
                </div>
                <nav className="mt-6 px-4">
                    <ul className="space-y-2">
                        {menuItems.map((item) => (
                            <li key={item.path}>
                                <Link
                                    to={item.path}
                                    onClick={handleMenuClick}
                                    className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-left transition-colors duration-200 ${location.pathname === item.path
                                        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                        }`}
                                >
                                    <span className={location.pathname === item.path ? 'text-blue-600' : 'text-gray-400'}>
                                        {item.icon}
                                    </span>
                                    <span className="font-medium">{item.label}</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
                    <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                            <User size={16} className="text-gray-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">John Doe</p>
                            <p className="text-xs text-gray-500 truncate">john@example.com</p>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
                <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                            >
                                <Menu size={20} />
                            </button>
                            <h1 className="text-xl font-semibold text-gray-800">
                                {menuItems.find(item => item.path === location.pathname)?.label || 'Dashboard'}
                            </h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="hidden md:flex items-center space-x-2 bg-gray-100 rounded-lg px-3 py-2">
                                <Search size={16} className="text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    className="bg-transparent border-none outline-none text-sm text-gray-700 placeholder-gray-400"
                                />
                            </div>
                            <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                                <Bell size={20} />
                                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                            </button>
                            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer">
                                <span className="text-white text-sm font-medium">JD</span>
                            </div>
                        </div>
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
                    <Outlet />
                </main>
            </div>
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                ></div>
            )}
        </div>
    );
};

export default Layout;