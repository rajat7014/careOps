'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Icon } from '@/components/icons';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface Integration {
  id: string;
  type: string;
  provider: string;
  isActive: boolean;
}

export default function IntegrationsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, role } = useAuth();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    if (isAuthenticated) fetchIntegrations();
  }, [isAuthenticated, authLoading, router]);

  const fetchIntegrations = async () => {
    try {
      setIsLoading(true);
      const response = await api.get<{ success: boolean; data: Integration[] }>('/onboarding/integration');
      if (response.success) setIntegrations(response.data);
    } catch (err: any) {
      if (err.status === 401) router.push('/login');
      else setError(err.message || 'Failed to load integrations');
    } finally {
      setIsLoading(false);
    }
  };

  if (role !== 'OWNER') {
    return (
      <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
        Only workspace owners can manage integrations.
      </div>
    );
  }

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
        {error}
      </div>
    );
  }

  const emailIntegration = integrations.find(i => i.type === 'EMAIL');
  const smsIntegration = integrations.find(i => i.type === 'SMS');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground">Connect your communication channels</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Email Integration */}
        <div className="border rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Icon name="Building2" className="text-blue-600" size={20} />
              </div>
              <div>
                <h3 className="font-medium">Email</h3>
                <p className="text-sm text-muted-foreground">SendGrid</p>
              </div>
            </div>
            <span className={cn(
              'inline-flex px-2 py-1 text-xs font-medium rounded-full',
              emailIntegration?.isActive 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            )}>
              {emailIntegration?.isActive ? 'Connected' : 'Not Connected'}
            </span>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Send booking confirmations, reminders, and notifications via email.
          </p>
          <button
            onClick={() => setShowEmailModal(true)}
            className={cn(
              'mt-4 w-full py-2 px-4 rounded-md text-sm font-medium',
              emailIntegration?.isActive
                ? 'border border-input hover:bg-accent'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            )}
          >
            {emailIntegration?.isActive ? 'Configure' : 'Connect'}
          </button>
        </div>

        {/* SMS Integration */}
        <div className="border rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Icon name="MessageSquare" className="text-purple-600" size={20} />
              </div>
              <div>
                <h3 className="font-medium">SMS</h3>
                <p className="text-sm text-muted-foreground">Twilio</p>
              </div>
            </div>
            <span className={cn(
              'inline-flex px-2 py-1 text-xs font-medium rounded-full',
              smsIntegration?.isActive 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            )}>
              {smsIntegration?.isActive ? 'Connected' : 'Not Connected'}
            </span>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Send text message reminders and alerts to customers.
          </p>
          <button
            onClick={() => setShowSmsModal(true)}
            className={cn(
              'mt-4 w-full py-2 px-4 rounded-md text-sm font-medium',
              smsIntegration?.isActive
                ? 'border border-input hover:bg-accent'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            )}
          >
            {smsIntegration?.isActive ? 'Configure' : 'Connect'}
          </button>
        </div>
      </div>

      {/* Email Integration Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-lg border border-border w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Connect SendGrid (Email)</h2>
              <button
                onClick={() => setShowEmailModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <Icon name="X" size={20} />
              </button>
            </div>
            
            {connectError && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {connectError}
              </div>
            )}

            <form onSubmit={async (e) => {
              e.preventDefault();
              setConnectError(null);
              setIsConnecting(true);
              
              const formData = new FormData(e.currentTarget);
              const data = {
                type: 'EMAIL',
                provider: 'SENDGRID',
                apiKey: formData.get('apiKey'),
                fromEmail: formData.get('fromEmail'),
              };
              
              try {
                await api.post('/onboarding/integration', data);
                setShowEmailModal(false);
                fetchIntegrations();
              } catch (err: any) {
                setConnectError(err.message || 'Failed to connect SendGrid');
              } finally {
                setIsConnecting(false);
              }
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">SendGrid API Key *</label>
                <input
                  name="apiKey"
                  type="password"
                  placeholder="SG.xxx..."
                  className="w-full px-3 py-2 rounded-md border border-input bg-background"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">From Email *</label>
                <input
                  name="fromEmail"
                  type="email"
                  placeholder="notifications@yourdomain.com"
                  className="w-full px-3 py-2 rounded-md border border-input bg-background"
                  required
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="flex-1 px-4 py-2 rounded-md border border-input hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isConnecting}
                  className="flex-1 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {isConnecting ? 'Connecting...' : 'Connect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SMS Integration Modal */}
      {showSmsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-lg border border-border w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Connect Twilio (SMS)</h2>
              <button
                onClick={() => setShowSmsModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <Icon name="X" size={20} />
              </button>
            </div>
            
            {connectError && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {connectError}
              </div>
            )}

            <form onSubmit={async (e) => {
              e.preventDefault();
              setConnectError(null);
              setIsConnecting(true);
              
              const formData = new FormData(e.currentTarget);
              const data = {
                type: 'SMS',
                provider: 'TWILIO',
                accountSid: formData.get('accountSid'),
                authToken: formData.get('authToken'),
                fromPhone: formData.get('fromPhone'),
              };
              
              try {
                await api.post('/onboarding/integration', data);
                setShowSmsModal(false);
                fetchIntegrations();
              } catch (err: any) {
                setConnectError(err.message || 'Failed to connect Twilio');
              } finally {
                setIsConnecting(false);
              }
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Account SID *</label>
                <input
                  name="accountSid"
                  type="text"
                  placeholder="ACxxx..."
                  className="w-full px-3 py-2 rounded-md border border-input bg-background"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Auth Token *</label>
                <input
                  name="authToken"
                  type="password"
                  placeholder="Your auth token"
                  className="w-full px-3 py-2 rounded-md border border-input bg-background"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">From Phone Number *</label>
                <input
                  name="fromPhone"
                  type="tel"
                  placeholder="+1234567890"
                  className="w-full px-3 py-2 rounded-md border border-input bg-background"
                  required
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSmsModal(false)}
                  className="flex-1 px-4 py-2 rounded-md border border-input hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isConnecting}
                  className="flex-1 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {isConnecting ? 'Connecting...' : 'Connect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
