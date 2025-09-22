'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Download, CheckCircle, AlertCircle, ExternalLink, Copy, Settings, Zap } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface TradingAccount {
  id: string
  account_name: string
  account_number: string
  broker: string
}

interface SetupStep {
  step: number
  title: string
  description: string
  action: string
}

interface SetupInstructions {
  account_name: string
  account_number: string
  steps: SetupStep[]
  troubleshooting: {
    webRequest_error: string
    no_logs: string
    api_error: string
  }
}

export default function EASetupPage() {
  const [accounts, setAccounts] = useState<TradingAccount[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string>('')
  const [apiKey, setApiKey] = useState<string>('')
  const [instructions, setInstructions] = useState<SetupInstructions | null>(null)
  const [loading, setLoading] = useState(false)
  const [downloadLoading, setDownloadLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    fetchAccounts()
    fetchApiKey()
  }, [])

  const fetchAccounts = async () => {
    try {
      // For now, use a mock account since we're testing
      const mockAccounts = [
        {
          id: 'ca02be81-8de8-4129-8ddc-4d14cd8cebff',
          account_name: 'FTMO',
          account_number: '510266178',
          broker: 'FTMO'
        }
      ]
      setAccounts(mockAccounts)
      if (mockAccounts.length > 0) {
        setSelectedAccount(mockAccounts[0].id)
        fetchInstructions(mockAccounts[0].id)
      }
    } catch (error) {
      console.error('Error fetching accounts:', error)
      toast({
        title: "Error",
        description: "Failed to load trading accounts",
        variant: "destructive"
      })
    }
  }

  const fetchApiKey = async () => {
    try {
      // Mock API key for demonstration
      setApiKey('qv_test_1234567890abcdef')
    } catch (error) {
      console.error('Error fetching API key:', error)
    }
  }

  const fetchInstructions = async (accountId: string) => {
    if (!accountId) return
    
    setLoading(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
      const response = await fetch(`${apiUrl}/api/v1/ea/setup-instructions/${accountId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch setup instructions')
      }
      
      const data = await response.json()
      setInstructions(data)
    } catch (error) {
      console.error('Error fetching instructions:', error)
      toast({
        title: "Error",
        description: "Failed to load setup instructions",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const downloadEA = async () => {
    if (!selectedAccount || !apiKey) {
      toast({
        title: "Missing Information",
        description: "Please select an account and ensure you have an API key",
        variant: "destructive"
      })
      return
    }

    setDownloadLoading(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
      const response = await fetch(
        `${apiUrl}/api/v1/ea/download/${selectedAccount}?api_key=${apiKey}`
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Download failed')
      }

      // Get filename from response headers
      const contentDisposition = response.headers.get('Content-Disposition')
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : 'QuantaView_EA.mq5'

      // Download the file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Download Successful",
        description: `${filename} has been downloaded to your computer`,
      })
    } catch (error: any) {
      console.error('Download error:', error)
      toast({
        title: "Download Failed",
        description: error.message || "Failed to download EA file",
        variant: "destructive"
      })
    } finally {
      setDownloadLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied",
      description: "Copied to clipboard",
    })
  }

  const selectedAccountData = accounts.find(acc => acc.id === selectedAccount)

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">EA Setup & Download</h1>
        <p className="text-muted-foreground">
          Download your pre-configured Expert Advisor and connect your MT5 account to QuantaView
        </p>
      </div>

      {/* Account Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Select Trading Account
          </CardTitle>
          <CardDescription>
            Choose which trading account you want to connect to QuantaView
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {accounts.length > 0 ? (
            <div className="grid gap-3">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedAccount === account.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => {
                    setSelectedAccount(account.id)
                    fetchInstructions(account.id)
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{account.account_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Account: {account.account_number} • Broker: {account.broker}
                      </p>
                    </div>
                    <Badge variant={selectedAccount === account.id ? "default" : "outline"}>
                      {selectedAccount === account.id ? "Selected" : "Select"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No trading accounts found. Please create a trading account first.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Download Section */}
      {selectedAccountData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Download Pre-Configured EA
            </CardTitle>
            <CardDescription>
              Your EA is automatically configured for {selectedAccountData.account_name} 
              - no manual setup required!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
              <div className="space-y-1">
                <p className="font-medium">QuantaView_{selectedAccountData.account_name}.mq5</p>
                <p className="text-sm text-muted-foreground">
                  Pre-configured for account {selectedAccountData.account_number}
                </p>
              </div>
              <Button 
                onClick={downloadEA} 
                disabled={downloadLoading}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                {downloadLoading ? 'Downloading...' : 'Download EA'}
              </Button>
            </div>

            <Alert>
              <Zap className="h-4 w-4" />
              <AlertDescription>
                <strong>Zero Configuration Required!</strong> Your API key and account ID are 
                already embedded in the downloaded file. Just compile and attach to any chart.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Setup Instructions */}
      {instructions && (
        <Card>
          <CardHeader>
            <CardTitle>Setup Instructions</CardTitle>
            <CardDescription>
              Follow these steps to install and configure your QuantaView EA
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {instructions.steps.map((step, index) => (
              <div key={step.step} className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                  {step.step}
                </div>
                <div className="space-y-2">
                  <h3 className="font-medium">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-mono">{step.action}</p>
                  </div>
                  {step.step === 2 && (
                    <div className="flex items-center gap-2 mt-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        https://grateful-mindfulness-production-868e.up.railway.app
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard('https://grateful-mindfulness-production-868e.up.railway.app')}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Troubleshooting */}
      {instructions && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Troubleshooting
            </CardTitle>
            <CardDescription>
              Common issues and their solutions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-sm">WebRequest Error</h4>
                <p className="text-sm text-muted-foreground">{instructions.troubleshooting.webRequest_error}</p>
              </div>
              <div>
                <h4 className="font-medium text-sm">No Logs Appearing</h4>
                <p className="text-sm text-muted-foreground">{instructions.troubleshooting.no_logs}</p>
              </div>
              <div>
                <h4 className="font-medium text-sm">API Connection Error</h4>
                <p className="text-sm text-muted-foreground">{instructions.troubleshooting.api_error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Support */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
          <CardDescription>
            Having trouble with the setup? We're here to help!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button variant="outline" asChild>
              <a href="mailto:support@quantaview.ai" className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                Contact Support
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/dashboard" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Back to Dashboard
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}