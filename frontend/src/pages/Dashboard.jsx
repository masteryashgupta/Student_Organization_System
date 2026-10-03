import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import api from "../api/client";

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    activeMembers: 248,
    upcomingEvents: "08",
    openTasks: 17,
    ticketRevenue: "₹18.4k",
    treasuryBalance: "42,860",
  });

  const firstName = user?.first_name || (user?.full_name ? user.full_name.split(" ")[0] : "Alex");

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div className="date-indicator">Monday · 14 April 2025</div>
          <h1 className="page-title">
            Good morning, {firstName} ✦
          </h1>
          <p className="page-subtitle">
            Here’s what is moving across Skyline today.
          </p>
        </div>

        <button className="btn-primary">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>Create update</span>
        </button>
      </div>

      {/* Hero 2-card Grid */}
      <div className="dashboard-hero-grid">
        {/* Left: Membership Blue Card */}
        <div className="hero-membership-card">
          <div className="hero-left-content">
            <div className="tier-pill">Premium Member</div>
            <h2>Your campus, in motion.</h2>
            <p>
              Membership renews in <strong>48 days</strong>. Your 15% event and
              merch discount is active.
            </p>
            <Link to="/events" className="btn-white">
              <span>View membership</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="7" y1="17" x2="17" y2="7"></line>
                <polyline points="7 7 17 7 17 17"></polyline>
              </svg>
            </Link>
          </div>

          <div className="hero-discount-graphic">
            <span className="discount-number">15</span>
            <div className="discount-suffix">
              <span>%</span>
              <span>off</span>
            </div>
          </div>
        </div>

        {/* Right: Org Pulse Navy Card */}
        <div className="hero-pulse-card">
          <div className="pulse-header">
            <span className="pulse-title">Org Pulse</span>
            <span className="pulse-badge">
              <span className="green-dot"></span>
              <span>LIVE</span>
            </span>
          </div>

          <div>
            <div className="pulse-balance">₹{stats.treasuryBalance}</div>
            <div className="pulse-sub">Available treasury balance</div>
          </div>

          <div className="pulse-mini-chart">
            <div className="chart-bar" style={{ height: "40%" }}></div>
            <div className="chart-bar" style={{ height: "65%" }}></div>
            <div className="chart-bar" style={{ height: "50%" }}></div>
            <div className="chart-bar" style={{ height: "85%" }}></div>
            <div className="chart-bar" style={{ height: "70%" }}></div>
            <div className="chart-bar" style={{ height: "95%" }}></div>
            <div className="chart-bar" style={{ height: "75%" }}></div>
          </div>

          <div className="pulse-footer">
            <span>+18.4% this month</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="7" y1="17" x2="17" y2="7"></line>
              <polyline points="7 7 17 7 17 17"></polyline>
            </svg>
          </div>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="metrics-row">
        <div className="metric-card">
          <div className="metric-icon-wrap blue">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <div className="metric-label">Active members</div>
          <div className="metric-value">{stats.activeMembers}</div>
          <div className="metric-sub">+12 this month</div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap amber">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          <div className="metric-label">Upcoming events</div>
          <div className="metric-value">{stats.upcomingEvents}</div>
          <div className="metric-sub">Next: Open Mic · Fri</div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap green">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2"></rect>
              <path d="m9 12 2 2 4-4"></path>
            </svg>
          </div>
          <div className="metric-label">Open tasks</div>
          <div className="metric-value">{stats.openTasks}</div>
          <div className="metric-sub">5 due this week</div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap slate">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 6v12"></path>
              <path d="M15 9.5a3 3 0 0 0-6 0c0 2 3 3 6 4s-3 3-6 3"></path>
            </svg>
          </div>
          <div className="metric-label">Ticket revenue</div>
          <div className="metric-value">{stats.ticketRevenue}</div>
          <div className="metric-sub">+8.2% vs last month</div>
        </div>
      </div>

      {/* 2-Column Split: Events on radar & Announcements */}
      <div className="dashboard-split-grid">
        {/* Next Up Events */}
        <div className="section-panel">
          <div className="section-panel-header">
            <div>
              <div className="section-tag">Next Up</div>
              <h3>Events on your radar</h3>
            </div>
            <Link to="/events" className="panel-link">
              <span>View all</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="7" y1="17" x2="17" y2="7"></line>
                <polyline points="7 7 17 7 17 17"></polyline>
              </svg>
            </Link>
          </div>

          <div className="event-list-stack">
            <Link to="/events" className="event-list-item">
              <div className="event-thumb-wrap">
                <img src="/images/event1.jpg" alt="Skyline Social" />
              </div>

              <div className="event-date-badge-sm">
                <div className="event-date-day">18</div>
                <div className="event-date-month">Apr</div>
              </div>

              <div className="event-meta-info">
                <div className="event-title-sm">Skyline Social: Open Mic</div>
                <div className="event-sub-sm">6:30 PM · The Quad Amphitheatre</div>
              </div>

              <div className="event-price-col">
                <div className="event-price-val">₹180</div>
                <div className="event-price-sub">member price</div>
              </div>

              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5">
                <line x1="7" y1="17" x2="17" y2="7"></line>
                <polyline points="7 7 17 7 17 17"></polyline>
              </svg>
            </Link>

            <Link to="/events" className="event-list-item">
              <div className="event-thumb-wrap">
                <img src="/images/event2.jpg" alt="Designing for Tomorrow" />
              </div>

              <div className="event-date-badge-sm">
                <div className="event-date-day">24</div>
                <div className="event-date-month">Apr</div>
              </div>

              <div className="event-meta-info">
                <div className="event-title-sm">Designing for Tomorrow</div>
                <div className="event-sub-sm">4:00 PM · Innovation Lab 02</div>
              </div>

              <div className="event-price-col">
                <div className="event-price-val">Free</div>
                <div className="event-price-sub">member price</div>
              </div>

              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5">
                <line x1="7" y1="17" x2="17" y2="7"></line>
                <polyline points="7 7 17 7 17 17"></polyline>
              </svg>
            </Link>
          </div>
        </div>

        {/* Latest Announcements */}
        <div className="section-panel">
          <div className="section-panel-header">
            <div>
              <div className="section-tag">In The Know</div>
              <h3>Latest announcements</h3>
            </div>
            <Link to="/announcements" className="panel-link">
              <span>See feed</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="7" y1="17" x2="17" y2="7"></line>
                <polyline points="7 7 17 7 17 17"></polyline>
              </svg>
            </Link>
          </div>

          <div className="announcement-list-stack">
            <Link to="/announcements" className="announcement-list-item">
              <div className="announcement-content-left">
                <div className="category-dot urgent"></div>
                <div>
                  <div className="announcement-title-sm">
                    Volunteer briefing moved to 5:30 PM
                  </div>
                  <div className="announcement-meta-sm">Today · URGENT</div>
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </Link>

            <Link to="/announcements" className="announcement-list-item">
              <div className="announcement-content-left">
                <div className="category-dot event"></div>
                <div>
                  <div className="announcement-title-sm">
                    Open Mic sign-ups are now live
                  </div>
                  <div className="announcement-meta-sm">Yesterday · EVENT</div>
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </Link>

            <Link to="/announcements" className="announcement-list-item">
              <div className="announcement-content-left">
                <div className="category-dot general"></div>
                <div>
                  <div className="announcement-title-sm">
                    Spring membership renewal window
                  </div>
                  <div className="announcement-meta-sm">14 Apr · GENERAL</div>
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
