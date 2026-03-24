/**
 * Task State Machine Tests
 * 
 * Comprehensive tests for state transitions, guards, and context updates.
 */

import {
  TaskStateMachine,
  createTaskStateMachine,
  getTerminalStates,
  getActiveStates,
  isPendingState,
  isTerminalState,
  TaskStateContext,
  TaskEvent,
} from '../../src/core/state-machines/task.machine';
import { TaskStatus } from '../../src/types/domain';
import {
  createTaskStateContext,
  createDependenciesMetEvent,
  createAssignedEvent,
  createStartedEvent,
  createCompletedEvent,
  createFailedEvent,
  createBlockedEvent,
  createUnblockedEvent,
  createCancelEvent,
} from '../fixtures/factories';

// ============================================================================
// TEST SETUP
// ============================================================================

describe('TaskStateMachine', () => {
  let machine: TaskStateMachine;
  let context: TaskStateContext;

  beforeEach(() => {
    context = createTaskStateContext();
    machine = new TaskStateMachine('QUEUED', context);
  });

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  describe('initialization', () => {
    it('should initialize with given state and context', () => {
      expect(machine.getState()).toBe('QUEUED');
      expect(machine.getContext()).toEqual(expect.objectContaining({
        taskId: context.taskId,
        retryCount: 0,
        maxRetries: 3,
      }));
    });

    it('should create machine using factory function', () => {
      const factoryMachine = createTaskStateMachine('task-123', 'READY', {
        assigneeId: 'agent-1',
      });
      
      expect(factoryMachine.getState()).toBe('READY');
      expect(factoryMachine.getContext().assigneeId).toBe('agent-1');
    });

    it('should create immutable context copy', () => {
      const ctx = machine.getContext();
      ctx.retryCount = 999;
      
      expect(machine.getContext().retryCount).toBe(0);
    });
  });

  // ============================================================================
  // QUEUED STATE TRANSITIONS
  // ============================================================================

  describe('QUEUED state', () => {
    beforeEach(() => {
      machine = new TaskStateMachine('QUEUED', context);
    });

    it('should transition to READY when dependencies are met', () => {
      const event: TaskEvent = createDependenciesMetEvent();
      const result = machine.transition(event);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe('READY');
      }
    });

    it('should block transition to READY when unmet dependencies exist', () => {
      const ctxWithDeps = createTaskStateContext({ unmetDependencies: ['task-1'] });
      machine = new TaskStateMachine('QUEUED', ctxWithDeps);
      
      const event: TaskEvent = createDependenciesMetEvent();
      const result = machine.transition(event);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('Guard condition failed');
      }
    });

    it('should transition to CANCELED on CANCEL event', () => {
      const event: TaskEvent = createCancelEvent('No longer needed');
      const result = machine.transition(event);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe('CANCELED');
      }
    });

    it('should not allow STARTED event from QUEUED', () => {
      const event: TaskEvent = createStartedEvent();
      const result = machine.transition(event);

      expect(result.ok).toBe(false);
    });
  });

  // ============================================================================
  // READY STATE TRANSITIONS
  // ============================================================================

  describe('READY state', () => {
    beforeEach(() => {
      machine = new TaskStateMachine('READY', context);
    });

    it('should transition to ASSIGNED with valid assignee', () => {
      const event: TaskEvent = createAssignedEvent('agent-123');
      const result = machine.transition(event);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe('ASSIGNED');
        expect(result.value.context.assigneeId).toBe('agent-123');
      }
    });

    it('should block ASSIGNED transition without assigneeId', () => {
      const event: TaskEvent = { type: 'ASSIGNED', assigneeId: '' };
      const result = machine.transition(event);

      expect(result.ok).toBe(false);
    });

    it('should transition back to QUEUED when dependencies become unmet', () => {
      const event: TaskEvent = { type: 'DEPENDENCIES_UNMET' };
      const result = machine.transition(event);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe('QUEUED');
      }
    });

    it('should transition to CANCELED on CANCEL event', () => {
      const event: TaskEvent = createCancelEvent('Cancelled');
      const result = machine.transition(event);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe('CANCELED');
      }
    });
  });

  // ============================================================================
  // ASSIGNED STATE TRANSITIONS
  // ============================================================================

  describe('ASSIGNED state', () => {
    beforeEach(() => {
      context = createTaskStateContext({ assigneeId: 'agent-123' });
      machine = new TaskStateMachine('ASSIGNED', context);
    });

    it('should transition to RUNNING when agent is online', () => {
      const event: TaskEvent = createStartedEvent();
      const result = machine.transition(event);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe('RUNNING');
      }
    });

    it('should block STARTED when agent is offline', () => {
      context.agentStatus = 'OFFLINE';
      machine = new TaskStateMachine('ASSIGNED', context);
      
      const event: TaskEvent = createStartedEvent();
      const result = machine.transition(event);

      expect(result.ok).toBe(false);
    });

    it('should transition to READY on UNASSIGNED', () => {
      const event: TaskEvent = { type: 'UNASSIGNED' };
      const result = machine.transition(event);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe('READY');
        expect(result.value.context.assigneeId).toBeUndefined();
      }
    });

    it('should transition to BLOCKED with blocker details', () => {
      const event: TaskEvent = createBlockedEvent('DEPENDENCY_UNMET', 'Waiting for API');
      const result = machine.transition(event);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe('BLOCKED');
        expect(result.value.context.blocker).toEqual({
          type: 'DEPENDENCY_UNMET',
          reason: 'Waiting for API',
        });
      }
    });
  });

  // ============================================================================
  // RUNNING STATE TRANSITIONS
  // ============================================================================

  describe('RUNNING state', () => {
    beforeEach(() => {
      context = createTaskStateContext({ assigneeId: 'agent-123' });
      machine = new TaskStateMachine('RUNNING', context);
    });

    it('should transition to AWAITING_VALIDATION with outputs', () => {
      const outputs = { result: 'success', data: { key: 'value' } };
      const event: TaskEvent = createCompletedEvent(outputs);
      const result = machine.transition(event);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe('AWAITING_VALIDATION');
        expect(result.value.context.outputs).toEqual(outputs);
      }
    });

    it('should block COMPLETED without outputs', () => {
      const event: TaskEvent = createCompletedEvent();
      const ctxNoOutputs = createTaskStateContext({ assigneeId: 'agent-123' });
      machine = new TaskStateMachine('RUNNING', ctxNoOutputs);
      
      const result = machine.transition(event);

      expect(result.ok).toBe(false);
    });

    it('should allow COMPLETED if context already has outputs', () => {
      context.outputs = { existing: 'data' };
      machine = new TaskStateMachine('RUNNING', context);
      
      const event: TaskEvent = createCompletedEvent();
      const result = machine.transition(event);

      expect(result.ok).toBe(true);
    });

    it('should transition to FAILED and increment retry count', () => {
      const event: TaskEvent = createFailedEvent('Build failed');
      const result = machine.transition(event);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe('FAILED');
        expect(result.value.context.retryCount).toBe(1);
      }
    });

    it('should transition to BLOCKED', () => {
      const event: TaskEvent = createBlockedEvent('EXTERNAL_DEPENDENCY', 'Waiting for third party');
      const result = machine.transition(event);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe('BLOCKED');
      }
    });

    it('should transition to CANCELED on CANCEL event', () => {
      const event: TaskEvent = createCancelEvent('Emergency stop');
      const result = machine.transition(event);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe('CANCELED');
      }
    });
  });

  // ============================================================================
  // AWAITING_VALIDATION STATE TRANSITIONS
  // ============================================================================

  describe('AWAITING_VALIDATION state', () => {
    beforeEach(() => {
      machine = new TaskStateMachine('AWAITING_VALIDATION', context);
    });

    it('should transition to COMPLETE on VALIDATED', () => {
      const event: TaskEvent = { type: 'VALIDATED' };
      const result = machine.transition(event);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe('COMPLETE');
      }
    });

    it('should transition to FAILED on REJECTED if retries remain', () => {
      const event: TaskEvent = { type: 'REJECTED', reason: 'Does not meet criteria' };
      const result = machine.transition(event);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe('FAILED');
      }
    });

    it('should block REJECTED if max retries exceeded', () => {
      context.retryCount = 3;
      machine = new TaskStateMachine('AWAITING_VALIDATION', context);
      
      const event: TaskEvent = { type: 'REJECTED', reason: 'Failed again' };
      const result = machine.transition(event);

      expect(result.ok).toBe(false);
    });
  });

  // ============================================================================
  // BLOCKED STATE TRANSITIONS
  // ============================================================================

  describe('BLOCKED state', () => {
    beforeEach(() => {
      context = createTaskStateContext({ 
        assigneeId: 'agent-123',
        blocker: { type: 'EXTERNAL_DEPENDENCY', reason: 'Waiting' }
      });
      machine = new TaskStateMachine('BLOCKED', context);
    });

    it('should transition to RUNNING on UNBLOCKED and clear blocker', () => {
      const event: TaskEvent = createUnblockedEvent('API now available');
      const result = machine.transition(event);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe('RUNNING');
        expect(result.value.context.blocker).toBeUndefined();
      }
    });

    it('should transition to READY on UNASSIGNED and clear blocker', () => {
      const event: TaskEvent = { type: 'UNASSIGNED' };
      const result = machine.transition(event);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe('READY');
        expect(result.value.context.assigneeId).toBeUndefined();
        expect(result.value.context.blocker).toBeUndefined();
      }
    });
  });

  // ============================================================================
  // FAILED STATE TRANSITIONS
  // ============================================================================

  describe('FAILED state', () => {
    beforeEach(() => {
      context = createTaskStateContext({ retryCount: 1 });
      machine = new TaskStateMachine('FAILED', context);
    });

    it('should transition to READY on RETRY if retries remain', () => {
      const event: TaskEvent = { type: 'RETRY' };
      const result = machine.transition(event);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe('READY');
      }
    });

    it('should block RETRY if max retries exceeded', () => {
      context.retryCount = 3;
      machine = new TaskStateMachine('FAILED', context);
      
      const event: TaskEvent = { type: 'RETRY' };
      const result = machine.transition(event);

      expect(result.ok).toBe(false);
    });

    it('should transition to CANCELED on CANCEL', () => {
      const event: TaskEvent = createCancelEvent('Abandoned');
      const result = machine.transition(event);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe('CANCELED');
      }
    });

    it('should allow FORCE_COMPLETE as admin override', () => {
      const event: TaskEvent = { type: 'FORCE_COMPLETE' };
      const result = machine.transition(event);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe('COMPLETE');
      }
    });
  });

  // ============================================================================
  // TERMINAL STATES
  // ============================================================================

  describe('terminal states', () => {
    it('COMPLETE should have no outgoing transitions', () => {
      machine = new TaskStateMachine('COMPLETE', context);
      
      const events: TaskEvent['type'][] = [
        'CANCEL', 'RETRY', 'STARTED', 'FAILED', 'ASSIGNED'
      ];
      
      for (const eventType of events) {
        const event = { type: eventType } as TaskEvent;
        const result = machine.transition(event);
        expect(result.ok).toBe(false);
      }
    });

    it('CANCELED should have no outgoing transitions', () => {
      machine = new TaskStateMachine('CANCELED', context);
      
      const events: TaskEvent['type'][] = [
        'CANCEL', 'STARTED', 'COMPLETED', 'FAILED'
      ];
      
      for (const eventType of events) {
        const event = { type: eventType } as TaskEvent;
        const result = machine.transition(event);
        expect(result.ok).toBe(false);
      }
    });
  });

  // ============================================================================
  // GUARD CONDITIONS
  // ============================================================================

  describe('guard conditions', () => {
    it('canTransition should check guards without executing', () => {
      machine = new TaskStateMachine('QUEUED', context);
      
      expect(machine.canTransition(createDependenciesMetEvent())).toBe(true);
      
      const ctxWithDeps = createTaskStateContext({ unmetDependencies: ['task-1'] });
      machine = new TaskStateMachine('QUEUED', ctxWithDeps);
      expect(machine.canTransition(createDependenciesMetEvent())).toBe(false);
    });

    it('should return current state unchanged after failed transition', () => {
      machine = new TaskStateMachine('QUEUED', context);
      const originalState = machine.getState();
      
      const result = machine.transition(createStartedEvent());
      expect(result.ok).toBe(false);
      expect(machine.getState()).toBe(originalState);
    });
  });

  // ============================================================================
  // GET ALLOWED EVENTS
  // ============================================================================

  describe('getAllowedEvents', () => {
    it('should return allowed events for QUEUED state', () => {
      machine = new TaskStateMachine('QUEUED', context);
      const allowed = machine.getAllowedEvents();
      
      expect(allowed).toContain('DEPENDENCIES_MET');
      expect(allowed).toContain('CANCEL');
    });

    it('should filter events by guard conditions', () => {
      const ctxWithDeps = createTaskStateContext({ unmetDependencies: ['task-1'] });
      machine = new TaskStateMachine('QUEUED', ctxWithDeps);
      const allowed = machine.getAllowedEvents();
      
      expect(allowed).not.toContain('DEPENDENCIES_MET');
      expect(allowed).toContain('CANCEL');
    });
  });

  // ============================================================================
  // withState METHOD
  // ============================================================================

  describe('withState', () => {
    it('should create new machine with updated state', () => {
      const newMachine = machine.withState('READY', { assigneeId: 'agent-1' });
      
      expect(newMachine.getState()).toBe('READY');
      expect(newMachine.getContext().assigneeId).toBe('agent-1');
      expect(machine.getState()).toBe('QUEUED'); // Original unchanged
    });
  });

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  describe('utility functions', () => {
    it('getTerminalStates should return COMPLETE and CANCELED', () => {
      const terminals = getTerminalStates();
      expect(terminals).toContain('COMPLETE');
      expect(terminals).toContain('CANCELED');
    });

    it('getActiveStates should return work-in-progress states', () => {
      const active = getActiveStates();
      expect(active).toContain('ASSIGNED');
      expect(active).toContain('RUNNING');
      expect(active).toContain('BLOCKED');
      expect(active).toContain('AWAITING_VALIDATION');
    });

    it('isPendingState should return true for QUEUED and READY', () => {
      expect(isPendingState('QUEUED')).toBe(true);
      expect(isPendingState('READY')).toBe(true);
      expect(isPendingState('RUNNING')).toBe(false);
    });

    it('isTerminalState should return true for terminal states', () => {
      expect(isTerminalState('COMPLETE')).toBe(true);
      expect(isTerminalState('CANCELED')).toBe(true);
      expect(isTerminalState('FAILED')).toBe(true);
      expect(isTerminalState('QUEUED')).toBe(false);
    });
  });
});
