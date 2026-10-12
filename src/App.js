import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Supabase client — initialised once here, import from './supabase' anywhere you need it
import './supabase';

import TradeFlowLanding from './componet/tradeflowlanding';
import SignUp           from './componet/user/signup';
import Login            from './componet/user/login';
import ForgotPassword   from './componet/user/forget_password';
import About            from './componet/about';
import Policy           from './componet/policy';
import Terms            from './componet/terms';
import Dashboard        from './dashboard/dashboard';
import Stocks           from './dashboard/stock';
import CopyTrading      from './dashboard/CopyTrading';
import HireTrader       from './dashboard/Hiretrader';
import RealEstate       from './dashboard/RealEstate';
import TradingTerminal  from './dashboard/terminal';
import Marketplace      from './dashboard/MarketPlace';
import Insights         from './dashboard/insights';
import Profile          from './dashboard/profile';
import Settings         from './dashboard/settings';
import Support          from './dashboard/support';
import Community        from './dashboard/community';
import Docs             from './dashboard/docs';
import Status           from './dashboard/status';
import Payment          from './dashboard/payment';
import Cards            from './dashboard/Cards';
import Notifications    from './dashboard/notification';
import Subscription     from './dashboard/subscription';
import Mining           from './dashboard/mining';
import VerifyIdentity   from './dashboard/VerifyIdentity';

// Admin console
import AdminLogin       from './admin/adminLogin';
import AdminDashboard   from './admin/adminDashboard';

// Live chat on every page except /admin
import ChatwayWidget    from './componet/ChatwayWidget';
// Suspended / locked account notices (the database enforces the rules)
import AccountGuard     from './account/AccountGuard';

function App() {
  return (
    <Router>
      <ChatwayWidget />
      <AccountGuard />
      <Routes>
        {/* Public */}
        <Route path="/"             element={<TradeFlowLanding />} />
        <Route path="/about"        element={<About />} />
        <Route path="/policy"       element={<Policy />} />
        <Route path="/privacy"      element={<Policy />} />
        <Route path="/terms"        element={<Terms />} />

        {/* Auth */}
        <Route path="/signup"       element={<SignUp />} />
        <Route path="/login"        element={<Login />} />
        <Route path="/forgot"       element={<ForgotPassword />} />

        {/* Overview */}
        <Route path="/dashboard"    element={<Dashboard />} />

        {/* Invest */}
        <Route path="/stocks"       element={<Stocks />} />
        <Route path="/copy-trading" element={<CopyTrading />} />
        <Route path="/hire-trader"  element={<HireTrader />} />
        <Route path="/real-estate"  element={<RealEstate />} />
        <Route path="/mining"       element={<Mining />} />
        <Route path="/terminal"     element={<TradingTerminal />} />

        {/* Discover */}
        <Route path="/market-place" element={<Marketplace />} />
        <Route path="/insights"     element={<Insights />} />

        {/* Account */}
        <Route path="/payments"     element={<Payment />} />
        <Route path="/cards"        element={<Cards />} />
        <Route path="/billing"      element={<Subscription />} />
        <Route path="/profile"      element={<Profile />} />
        <Route path="/verify-identity" element={<VerifyIdentity />} />
        <Route path="/settings"     element={<Settings />} />
        <Route path="/notification" element={<Notifications />} />

        {/* Help centre */}
        <Route path="/support"      element={<Support />} />
        <Route path="/community"    element={<Community />} />
        <Route path="/docs"         element={<Docs />} />
        <Route path="/status"       element={<Status />} />

        {/* Admin */}
        <Route path="/admin/login"     element={<AdminLogin />} />
        <Route path="/admin"           element={<AdminDashboard />} />
        <Route path="/admin/:section"  element={<AdminDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
