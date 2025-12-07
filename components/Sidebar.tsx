import React, { useState } from 'react';
import { LayoutDashboard, Fingerprint, Lightbulb, Palette, Film, ChevronLeft, ChevronRight } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  hasDNA: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, hasDNA }) => {
  const [collapsed, setCollapsed] = useState(false);

  const items = [
    { id: 'identity', label: 'Identity', icon: Fingerprint },
    { id: 'inspirations', label: 'Inspirations', icon: Lightbulb, disabled: !hasDNA },
    { id: 'studio', label: 'Studio', icon: Palette, disabled: !hasDNA },
    { id: 'ads', label: 'Ads', icon: Film, disabled: !hasDNA },
  ];

  return (
    <div className={`flex flex-col border-r border-zinc-800 bg-zinc-950 transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'}`}>
      <div className="h-16 flex items-center px-6 border-b border-zinc-800">
        <div className={`w-8 h-8 bg-gradient-to-tr from-orange-600 to-red-600 rounded-lg flex items-center justify-center shrink-0`}>
             <LayoutDashboard className="w-5 h-5 text-white" />
        </div>
        {!collapsed && <span className="ml-3 font-bold text-xl text-white tracking-tight">Brand Forge</span>}
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => !item.disabled && onTabChange(item.id)}
            disabled={item.disabled}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
              activeTab === item.id 
                ? 'bg-zinc-800 text-white' 
                : item.disabled 
                  ? 'opacity-40 cursor-not-allowed text-zinc-500' 
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-orange-500' : ''}`} />
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>

      <button 
        onClick={() => setCollapsed(!collapsed)}
        className="p-4 border-t border-zinc-800 text-zinc-500 hover:text-white flex justify-center"
      >
        {collapsed ? <ChevronRight /> : <ChevronLeft />}
      </button>
    </div>
  );
};

export default Sidebar;
