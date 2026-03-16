'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { getSettings, saveSettings } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Check, User, Bell, Shield, Database, AlertTriangle } from 'lucide-react'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator',
  pricing_manager: 'Pricing Manager',
  viewer: 'Viewer',
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-rose-100 text-rose-700 border-rose-200',
  pricing_manager: 'bg-blue-100 text-blue-700 border-blue-200',
  viewer: 'bg-secondary text-muted-foreground',
}

export default function SettingsPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const canEdit = user?.role === 'admin' || user?.role === 'pricing_manager'

  const [activeTab, setActiveTab] = useState('profile')

  // Profile state
  const [profileName, setProfileName] = useState(user?.name ?? '')
  const [profileEmail, setProfileEmail] = useState(user?.email ?? '')
  const [profileSaved, setProfileSaved] = useState(false)

  // Notifications
  const [notifyQuoteAccepted, setNotifyQuoteAccepted] = useState(true)
  const [notifyQuoteDeclined, setNotifyQuoteDeclined] = useState(true)
  const [notifyRateChanges, setNotifyRateChanges] = useState(isAdmin)
  const [notifyNewQuote, setNotifyNewQuote] = useState(canEdit)
  const [notifSaved, setNotifSaved] = useState(false)

  // System (admin / pricing_manager) — load from store
  const storedSettings = getSettings()
  const [companyName, setCompanyName] = useState(storedSettings.companyName ?? 'Virtual FM Group')
  const [defaultMargin, setDefaultMargin] = useState(String(storedSettings.defaultProfitMarginPct ?? 17))
  const [defaultAdjustment, setDefaultAdjustment] = useState(String(storedSettings.defaultAnnualAdjustmentPct ?? 2))
  const [defaultMarkup, setDefaultMarkup] = useState(String(storedSettings.defaultMobilisationMarkup ?? 13.64))
  const [vatRate, setVatRate] = useState(String(storedSettings.vatRate ?? 20))
  const [systemSaved, setSystemSaved] = useState(false)

  // Data (admin only)
  const [resetting, setResetting] = useState(false)

  function saveProfile() {
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 2000)
  }

  function saveNotifications() {
    setNotifSaved(true)
    setTimeout(() => setNotifSaved(false), 2000)
  }

  function saveSystem() {
    saveSettings({
      companyName,
      defaultProfitMarginPct: parseFloat(defaultMargin) || 17,
      defaultAnnualAdjustmentPct: parseFloat(defaultAdjustment) || 2,
      defaultMobilisationMarkup: parseFloat(defaultMarkup) || 13.64,
      vatRate: parseFloat(vatRate) || 20,
    })
    setSystemSaved(true)
    setTimeout(() => setSystemSaved(false), 2000)
  }

  function resetDemoData() {
    setResetting(true)
    if (typeof window !== 'undefined') {
      const keys = ['sfg20_rate_cards_v4', 'sfg20_quotes_v4', 'sfg20_seeded_v4', 'sfg20_settings_v4', 'sfg20_role_rates_v4']
      keys.forEach((k) => localStorage.removeItem(k))
    }
    setTimeout(() => { window.location.reload() }, 1200)
  }

  const navItems = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    ...(canEdit ? [{ id: 'system', label: 'System', icon: Shield }] : []),
    ...(isAdmin ? [{ id: 'data', label: 'Data', icon: Database }] : []),
  ]

  return (
    <div className="w-full min-h-screen bg-background">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="border-b border-border px-6 py-8">
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Manage your account preferences and application configuration.
          </p>
        </div>

        {/* Content */}
        <div className="flex flex-col lg:flex-row gap-8 px-6 py-8">
          {/* Sidebar Navigation */}
          <div className="w-full lg:w-48 flex-shrink-0">
            <nav className="flex flex-row lg:flex-col gap-2 pb-4 lg:pb-0 border-b lg:border-b-0 lg:border-r border-border">
              {navItems.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-all whitespace-nowrap lg:whitespace-normal ${
                    activeTab === id
                      ? 'bg-secondary text-foreground border-l-2 lg:border-l-2 lg:border-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0 max-w-2xl">
            {/* Profile Section */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Profile</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your personal account details and display preferences.
                  </p>
                </div>

                <Card>
                  <CardContent className="pt-6 space-y-6">
                    {/* Avatar Section */}
                    <div className="flex items-center gap-4 p-4 bg-secondary/40 rounded-lg">
                      <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg flex-shrink-0">
                        {user?.initials ?? '?'}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{user?.name ?? 'Unknown'}</p>
                        <p className="text-sm text-muted-foreground">{user?.email}</p>
                        <Badge variant="outline" className={`mt-2 ${ROLE_COLORS[user?.role ?? 'viewer']}`}>
                          {ROLE_LABELS[user?.role ?? 'viewer']}
                        </Badge>
                      </div>
                    </div>

                    <Separator />

                    {/* Name and Email */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="p-name">Display Name</Label>
                        <Input
                          id="p-name"
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          placeholder="Your name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="p-email">Email Address</Label>
                        <Input
                          id="p-email"
                          type="email"
                          value={profileEmail}
                          onChange={(e) => setProfileEmail(e.target.value)}
                          placeholder="your@email.com"
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Password Change */}
                    <div className="space-y-4">
                      <p className="text-sm font-semibold">Change Password</p>
                      <div className="space-y-2">
                        <Label htmlFor="p-current">Current Password</Label>
                        <Input id="p-current" type="password" placeholder="••••••••" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="p-new">New Password</Label>
                          <Input id="p-new" type="password" placeholder="••••••••" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="p-confirm">Confirm Password</Label>
                          <Input id="p-confirm" type="password" placeholder="••••••••" />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">Demo: all passwords are <code className="bg-secondary px-2 py-1 rounded text-foreground font-mono">password</code></p>
                    </div>

                    <Separator />

                    {/* Save Button */}
                    <div className="flex justify-end">
                      <Button onClick={saveProfile} className="gap-2">
                        {profileSaved && <Check className="w-4 h-4" />}
                        {profileSaved ? 'Saved' : 'Save Profile'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Notifications Section */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Notifications</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Choose which events trigger in-app alerts for you.
                  </p>
                </div>

                <Card>
                  <CardContent className="pt-6 space-y-6">
                    <div className="space-y-5">
                      {[
                        {
                          label: 'Quote accepted',
                          desc: 'Notify when a client accepts a quote',
                          value: notifyQuoteAccepted,
                          set: setNotifyQuoteAccepted,
                        },
                        {
                          label: 'Quote declined',
                          desc: 'Notify when a client declines a quote',
                          value: notifyQuoteDeclined,
                          set: setNotifyQuoteDeclined,
                        },
                        {
                          label: 'New quote created',
                          desc: 'Notify when a new quote is submitted',
                          value: notifyNewQuote,
                          set: setNotifyNewQuote,
                        },
                        {
                          label: 'Rate card changes',
                          desc: 'Notify when regional rates are updated',
                          value: notifyRateChanges,
                          set: setNotifyRateChanges,
                        },
                      ].map(({ label, desc, value, set }) => (
                        <div key={label} className="flex items-center justify-between gap-4 p-3 rounded-lg hover:bg-secondary/20 transition-colors">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">{label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                          </div>
                          <Switch checked={value} onCheckedChange={set} />
                        </div>
                      ))}
                    </div>

                    <Separator />

                    <div className="flex justify-end">
                      <Button onClick={saveNotifications} className="gap-2">
                        {notifSaved && <Check className="w-4 h-4" />}
                        {notifSaved ? 'Saved' : 'Save Preferences'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* System Settings Section */}
            {canEdit && activeTab === 'system' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">System Settings</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Default values applied to all new quotes.
                    {!isAdmin && ' Some fields are restricted to Administrators.'}
                  </p>
                </div>

                <Card>
                  <CardContent className="pt-6 space-y-6">
                    {/* Company Name */}
                    <div className="space-y-2">
                      <Label htmlFor="s-company">Company Name</Label>
                      <Input
                        id="s-company"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        disabled={!isAdmin}
                        placeholder="Your company"
                      />
                      {!isAdmin && <p className="text-xs text-muted-foreground">Only Administrators can change the company name.</p>}
                    </div>

                    <Separator />

                    {/* Quote Defaults */}
                    <div className="space-y-4">
                      <p className="text-sm font-semibold">Quote Defaults</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="s-margin">Default Profit Margin %</Label>
                          <Input
                            id="s-margin"
                            type="number"
                            step="0.5"
                            min="0"
                            max="50"
                            value={defaultMargin}
                            onChange={(e) => setDefaultMargin(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="s-adj">Default Annual Adjustment %</Label>
                          <Input
                            id="s-adj"
                            type="number"
                            step="0.1"
                            min="0"
                            max="20"
                            value={defaultAdjustment}
                            onChange={(e) => setDefaultAdjustment(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="s-markup">Default Mobilisation Markup %</Label>
                          <Input
                            id="s-markup"
                            type="number"
                            step="0.01"
                            min="0"
                            max="50"
                            value={defaultMarkup}
                            onChange={(e) => setDefaultMarkup(e.target.value)}
                            disabled={!isAdmin}
                          />
                          {!isAdmin && <p className="text-xs text-muted-foreground">Administrator only.</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="s-vat">VAT Rate %</Label>
                          <Input
                            id="s-vat"
                            type="number"
                            step="1"
                            min="0"
                            max="30"
                            value={vatRate}
                            onChange={(e) => setVatRate(e.target.value)}
                            disabled={!isAdmin}
                          />
                          {!isAdmin && <p className="text-xs text-muted-foreground">Administrator only.</p>}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex justify-end">
                      <Button onClick={saveSystem} className="gap-2">
                        {systemSaved && <Check className="w-4 h-4" />}
                        {systemSaved ? 'Saved' : 'Save System Settings'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Data Management Section */}
            {isAdmin && activeTab === 'data' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Data Management</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Manage demo data stored in this browser session.
                  </p>
                </div>

                <Card>
                  <CardContent className="pt-6 space-y-6">
                    {/* Demo Accounts */}
                    <div className="rounded-lg border bg-secondary/30 p-4 space-y-3">
                      <p className="text-sm font-semibold">Demo Accounts</p>
                      <div className="space-y-2 text-sm">
                        {[
                          { email: 'kenny@example.com', role: 'admin' as const },
                          { email: 'sarah@example.com', role: 'pricing_manager' as const },
                          { email: 'james@example.com', role: 'viewer' as const },
                        ].map(({ email, role }) => (
                          <div key={email} className="flex items-center justify-between">
                            <span className="text-muted-foreground">{email}</span>
                            <Badge variant="outline" className={ROLE_COLORS[role]}>
                              {ROLE_LABELS[role]}
                            </Badge>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground pt-1">
                        All passwords: <code className="bg-secondary px-2 py-1 rounded text-foreground font-mono">password</code>
                      </p>
                    </div>

                    <Separator />

                    {/* Reset */}
                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-destructive">Reset Demo Data</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Clears all locally saved rate cards and quotes from this browser, then reloads to restore the original seed data. This cannot be undone.
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={resetDemoData}
                        disabled={resetting}
                        className="gap-2"
                      >
                        {resetting && <Check className="w-4 h-4" />}
                        {resetting ? 'Resetting…' : 'Reset to Demo Defaults'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
