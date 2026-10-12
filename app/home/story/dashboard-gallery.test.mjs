import assert from 'node:assert/strict';
import test from 'node:test';
import { dashboardStageAt, nextDashboardIndex, DASHBOARD_HOLD_VH } from './dashboard-gallery.ts';

test('dashboard follows the folder and stays inside the work hold in both directions', () => {
  assert.equal(dashboardStageAt(199, 210), false);
  assert.equal(dashboardStageAt(210, 210), true);
  assert.equal(dashboardStageAt(300, 210), true);
  assert.equal(dashboardStageAt(210 + DASHBOARD_HOLD_VH, 210), false);
  assert.equal(dashboardStageAt(209, 210), false);
});

test('paging wraps in both directions and safely handles missing or single images', () => {
  assert.equal(nextDashboardIndex(0, -1, 3), 2);
  assert.equal(nextDashboardIndex(2, 1, 3), 0);
  assert.equal(nextDashboardIndex(0, 1, 1), 0);
  assert.equal(nextDashboardIndex(0, -1, 0), 0);
});