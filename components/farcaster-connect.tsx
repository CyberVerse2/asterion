"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ExternalLink } from "lucide-react"

export default function FarcasterConnect() {
  const [isConnecting, setIsConnecting] = useState(false)

  const handleConnect = async () => {
    setIsConnecting(true)
    // This would integrate with Farcaster SDK
    // For now, we'll simulate the connection
    setTimeout(() => {
      setIsConnecting(false)
      // Redirect to main app or update auth state
    }, 2000)
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle>Welcome to Asterion</CardTitle>
        <CardDescription>Connect your Farcaster account to start reading and tipping authors</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={handleConnect} disabled={isConnecting} className="w-full flex items-center gap-2">
          <ExternalLink className="h-4 w-4" />
          {isConnecting ? "Connecting..." : "Connect with Farcaster"}
        </Button>

        <div className="text-xs text-muted-foreground text-center">
          By connecting, you agree to our terms and can set spending limits for tips
        </div>
      </CardContent>
    </Card>
  )
}
