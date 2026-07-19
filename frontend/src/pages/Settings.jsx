import React, { useState } from 'react';
import { Settings, Bell, Shield, CreditCard, Puzzle, Code2, MessageSquare, ExternalLink, Check } from 'lucide-react';

/**
 * Settings — Tabbed settings page with five sections: General, Notifications,
 * Privacy, Billing, and Integrations. Each tab renders its own content inline
 * via a switch statement. Toggles, selects, and buttons manage local state
 * only; no data is persisted. Frontend-only UI prototype.
 */
const tabs = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'privacy', label: 'Privacy', icon: Shield },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'integrations', label: 'Integrations', icon: Puzzle },
];

const integrations = [
  {
    name: 'GitHub',
    icon: Code2,
    description: 'Sync your repositories and get notified about pull requests.',
    connected: false,
  },
  {
    name: 'Slack',
    icon: MessageSquare,
    description: 'Post sprint updates and notifications to your Slack channels.',
    connected: false,
  },
  {
    name: 'Figma',
    icon: ExternalLink,
    description: 'Embed Figma designs directly in your sprint rooms.',
    connected: true,
  },
];

/* Reusable toggle switch built with a hidden checkbox (<input className="sr-only"/>) + an adjacent
   visual thumb/track styled via peer check. The label is clickable and wraps both the text and the
   switch control. When checked the brand colour fills the track and the white thumb slides right. */
const Toggle = ({ checked, onChange, label, description }) => (
  <label className="flex items-center justify-between py-4 border-b border-border last:border-b-0">
    <div>
      <span className="text-sm font-medium text-gray-800">{label}</span>
      {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
    </div>
    <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer" />
    <div className="relative w-11 h-6 bg-gray-200 peer-checked:bg-brand rounded-full cursor-pointer transition-all after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:shadow-sm after:transition-all peer-checked:after:translate-x-full" />
  </label>
);

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({
    theme: 'light',
    language: 'en',
    timezone: 'UTC',
    roomMentions: true,
    directMessages: true,
    sprintReminders: true,
    emailNotifications: false,
    showOnlineStatus: true,
    allowFileDownloads: true,
    shareProfile: false,
  });
  const update = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));

  const renderContent = () => {
    switch (activeTab) {
      /* ——— General ——— */
      case 'general':
        return (
          <div className="space-y-8">
            <div>
              <h3 className="section-title mb-1">Theme</h3>
              <p className="section-subtitle mb-4">Choose your preferred appearance.</p>
              <label className="flex items-center justify-between max-w-xs">
                <span className="text-sm text-gray-700">Dark Mode</span>
                <input type="checkbox" checked={settings.theme === 'dark'} onChange={e => update('theme', e.target.checked ? 'dark' : 'light')} className="sr-only peer" />
                <div className="relative w-11 h-6 bg-gray-200 peer-checked:bg-brand rounded-full cursor-pointer transition-all after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:shadow-sm after:transition-all peer-checked:after:translate-x-full" />
              </label>
            </div>

            <div>
              <h3 className="section-title mb-1">Language</h3>
              <p className="section-subtitle mb-4">Select your interface language.</p>
              <select
                className="input-field max-w-xs"
                value={settings.language}
                onChange={e => update('language', e.target.value)}
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="ja">Japanese</option>
              </select>
            </div>

            <div>
              <h3 className="section-title mb-1">Timezone</h3>
              <p className="section-subtitle mb-4">Set your local timezone.</p>
              <select
                className="input-field max-w-xs"
                value={settings.timezone}
                onChange={e => update('timezone', e.target.value)}
              >
                <option value="UTC">UTC (Coordinated Universal Time)</option>
                <option value="EST">EST (Eastern Standard Time)</option>
                <option value="PST">PST (Pacific Standard Time)</option>
                <option value="CET">CET (Central European Time)</option>
                <option value="IST">IST (Indian Standard Time)</option>
                <option value="JST">JST (Japan Standard Time)</option>
              </select>
            </div>
          </div>
        );

      /* ——— Notifications ——— */
      case 'notifications':
        return (
          <div>
            <h3 className="section-title mb-1">Notification Preferences</h3>
            <p className="section-subtitle mb-6">Manage how you receive notifications.</p>
            <div className="card divide-y divide-border">
              <Toggle
                label="Room mentions"
                description="Get notified when someone mentions you in a room"
                checked={settings.roomMentions}
                onChange={e => update('roomMentions', e.target.checked)}
              />
              <Toggle
                label="Direct messages"
                description="Receive notifications for direct messages"
                checked={settings.directMessages}
                onChange={e => update('directMessages', e.target.checked)}
              />
              <Toggle
                label="Sprint reminders"
                description="Get reminded when a sprint is about to end"
                checked={settings.sprintReminders}
                onChange={e => update('sprintReminders', e.target.checked)}
              />
              <Toggle
                label="Email notifications"
                description="Receive notification emails for missed activity"
                checked={settings.emailNotifications}
                onChange={e => update('emailNotifications', e.target.checked)}
              />
            </div>
          </div>
        );

      /* ——— Privacy ——— */
      case 'privacy':
        return (
          <div>
            <h3 className="section-title mb-1">Privacy Settings</h3>
            <p className="section-subtitle mb-6">Control your visibility and data sharing.</p>
            <div className="card divide-y divide-border">
              <Toggle
                label="Show online status"
                description="Let other users see when you are online"
                checked={settings.showOnlineStatus}
                onChange={e => update('showOnlineStatus', e.target.checked)}
              />
              <Toggle
                label="Allow file downloads"
                description="Allow other users to download files you share"
                checked={settings.allowFileDownloads}
                onChange={e => update('allowFileDownloads', e.target.checked)}
              />
              <Toggle
                label="Share profile"
                description="Make your profile visible to everyone on the platform"
                checked={settings.shareProfile}
                onChange={e => update('shareProfile', e.target.checked)}
              />
            </div>
          </div>
        );

      /* ——— Billing ——— */
      case 'billing':
        return (
          <div>
            <h3 className="section-title mb-1">Billing & Plan</h3>
            <p className="section-subtitle mb-6">Manage your subscription.</p>
            <div className="card max-w-lg">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <span className="badge-green">Free Plan</span>
                  <p className="text-sm text-gray-500 mt-2">You are currently on the Free plan.</p>
                </div>
              </div>
              <ul className="space-y-3 mb-6">
                {['Up to 5 active sprint rooms', 'Unlimited messages', 'Basic integrations', '24-hour message history'].map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                    <Check size={16} className="text-brand shrink-0" /> {feature}
                  </li>
                ))}
              </ul>
              <button className="btn-primary w-full">Upgrade to Pro</button>
              <p className="text-xs text-gray-400 text-center mt-3">$9.99/month — Cancel anytime.</p>
            </div>
          </div>
        );

      /* ——— Integrations ——— */
      case 'integrations':
        return (
          <div>
            <h3 className="section-title mb-1">Integrations</h3>
            <p className="section-subtitle mb-6">Connect your favorite tools.</p>
            <div className="space-y-4">
              {integrations.map((integration) => {
                const Icon = integration.icon;
                return (
                  <div key={integration.name} className="card flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                        <Icon size={20} className="text-brand" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800 text-sm">{integration.name}</h4>
                        <p className="text-xs text-gray-500">{integration.description}</p>
                      </div>
                    </div>
                    <button className={integration.connected ? 'btn-ghost text-sm' : 'btn-primary text-sm py-2 px-4'}>
                      {integration.connected ? 'Disconnect' : 'Connect'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex gap-8 max-w-5xl mx-auto relative z-10">
      <aside className="w-[200px] shrink-0">
        <nav className="space-y-1 sticky top-24">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-btn text-sm font-medium transition-all duration-200 ${
                  isActive ? 'bg-brand-badge text-brand' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 min-w-0 pb-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">{tabs.find(t => t.id === activeTab)?.label}</h2>
        <p className="section-subtitle mb-8">Manage your account settings and preferences.</p>
        {renderContent()}
      </div>
    </div>
  );
};

export default SettingsPage;
