import { useState } from "react";
import { Button } from "../components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";

import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  Coins,
  Crown,
  Zap,
  ArrowUp,
  ArrowDown,
  User,
  Timer,
  Sparkles,
  ArrowLeft,
  RefreshCw,
  Wallet,
  Eye,
  EyeOff,
  Send,
  Copy,
} from "lucide-react";

const Wallet_Page = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showBalance, setShowBalance] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Mock data
  const walletData = {
    balance: "1,234.56",
    currency: "ICP",
    userId: "rdmx6-jaaaa-aaaah-qcaiq-cai",
    walletAddress: "rrkah-fqaaa-aaaah-qcuremq-cai",
    totalEarned: "856.32",
    totalSpent: "421.88",
  };

  const recentTransactions = [
    {
      id: 1,
      type: "earned",
      amount: "+45.2 ICP",
      description: "Meme NFT Royalties",
      time: "2 hours ago",
    },
    {
      id: 2,
      type: "spent",
      amount: "-5.0 ICP",
      description: "Meme Generation Fee",
      time: "5 hours ago",
    },
    {
      id: 3,
      type: "earned",
      amount: "+12.8 ICP",
      description: "Staking Rewards",
      time: "1 day ago",
    },
    {
      id: 4,
      type: "spent",
      amount: "-2.5 ICP",
      description: "NFT Minting Fee",
      time: "2 days ago",
    },
  ];

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast({
      title: `${label} Copied! 📋`,
      description: "Address copied to clipboard",
    });
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      toast({
        title: "Balance Updated! 💰",
        description: "Your wallet balance has been refreshed",
      });
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/portfolio")}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Sparkles className="w-8 h-8 text-primary" />
                  <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                    My Wallet
                  </h1>
                </div>
                <p className="text-muted-foreground">
                  Manage your ICP balance and transactions
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Wallet Balance Card */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-primary opacity-10" />
          <CardHeader className="relative">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-6 h-6" />
                Wallet Balance
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowBalance(!showBalance)}
              >
                {showBalance ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="relative space-y-4">
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">
                {showBalance
                  ? `${walletData.balance} ${walletData.currency}`
                  : "••••••"}
              </div>
              <p className="text-muted-foreground">Available Balance</p>
            </div>

            <div className="flex gap-4 justify-center">
              <Button className="flex-1 max-w-32">
                <Send className="w-4 h-4 mr-2" />
                Send
              </Button>
              <Button variant="outline" className="flex-1 max-w-32">
                <Download className="w-4 h-4 mr-2" />
                Receive
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* User Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>User ID</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <code className="text-sm font-mono break-all">
                  {walletData.userId}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyToClipboard(walletData.userId, "User ID")}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Your unique identifier on the Internet Computer network
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Wallet Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <code className="text-sm font-mono break-all">
                  {walletData.walletAddress}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    copyToClipboard(walletData.walletAddress, "Wallet Address")
                  }
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Your wallet address for receiving ICP tokens
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-green-500">
                {walletData.totalEarned} ICP
              </div>
              <p className="text-sm text-muted-foreground">Total Earned</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-red-500">
                {walletData.totalSpent} ICP
              </div>
              <p className="text-sm text-muted-foreground">Total Spent</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium">{transaction.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {transaction.time}
                    </p>
                  </div>
                  <Badge
                    variant={
                      transaction.type === "earned" ? "default" : "secondary"
                    }
                    className={
                      transaction.type === "earned"
                        ? "text-green-600"
                        : "text-red-600"
                    }
                  >
                    {transaction.amount}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Wallet_Page;
