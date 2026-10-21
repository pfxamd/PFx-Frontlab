/**
 * ┌──────────────────────────────────────────────┐
 * │                                              │
 * │  PFxamd                                      │
 * │  Ahmed                                       │
 * │                                              │
 * └──────────────────────────────────────────────┘
 *
 * @project     PFx Frontlab
 * @author      Ahmed
 * @brand       PFxamd
 * @website     https://www.pfxamd.com
 * @repository  https://github.com/pfxamd/PFx-Frontlab
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { FrontlabApp } from './FrontlabApp';
import './styles/app.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><FrontlabApp /></React.StrictMode>
);