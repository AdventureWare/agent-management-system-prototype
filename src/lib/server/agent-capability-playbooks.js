export const AGENT_CAPABILITY_PLAYBOOKS = [
	{
		intent: 'create_task',
		steps: [
			{
				tool: 'ams_manifest',
				phase: 'discover',
				purpose: 'Confirm the current AMS surface before choosing a task command.'
			},
			{
				tool: 'ams_project_list',
				phase: 'inspect',
				purpose: 'Find the target project before creating the task.'
			},
			{
				tool: 'ams_task_create',
				phase: 'mutate',
				purpose: 'Create the new task in the chosen project.'
			},
			{
				tool: 'ams_task_get',
				phase: 'readback',
				purpose: 'Read the new task back immediately to verify the write.'
			}
		]
	},
	{
		intent: 'prepare_task_for_review',
		steps: [
			{
				tool: 'ams_manifest',
				phase: 'discover',
				purpose: 'Confirm the available task workflow commands before opening a gate.'
			},
			{
				tool: 'ams_task_get',
				phase: 'inspect',
				purpose: 'Inspect the current task state before attaching artifacts or requesting review.'
			},
			{
				tool: 'ams_task_attach',
				phase: 'mutate',
				purpose: 'Attach the artifact that supports the review request.'
			},
			{
				tool: 'ams_task_request_review',
				phase: 'mutate',
				purpose: 'Open the review gate once the task context is attached.'
			},
			{
				tool: 'ams_task_get',
				phase: 'readback',
				purpose: 'Verify that the review request is now recorded on the task.'
			}
		]
	},
	{
		intent: 'prepare_task_for_approval',
		steps: [
			{
				tool: 'ams_manifest',
				phase: 'discover',
				purpose: 'Confirm the available governance commands before requesting approval.'
			},
			{
				tool: 'ams_task_get',
				phase: 'inspect',
				purpose: 'Inspect the current task state before opening the approval gate.'
			},
			{
				tool: 'ams_task_request_approval',
				phase: 'mutate',
				purpose: 'Open the approval gate once the task is ready for final decision.'
			},
			{
				tool: 'ams_task_get',
				phase: 'readback',
				purpose: 'Verify that the approval request is now recorded on the task.'
			}
		]
	},
	{
		intent: 'accept_child_handoff',
		steps: [
			{
				tool: 'ams_manifest',
				phase: 'discover',
				purpose: 'Confirm the available child handoff commands before resolving delegated work.'
			},
			{
				tool: 'ams_task_get',
				phase: 'inspect',
				purpose: 'Inspect the parent task and pending child handoff before accepting it.'
			},
			{
				tool: 'ams_task_accept_child_handoff',
				phase: 'mutate',
				purpose: 'Accept the completed child handoff into the parent task.'
			},
			{
				tool: 'ams_task_get',
				phase: 'readback',
				purpose: 'Verify that the parent task reflects the accepted handoff.'
			}
		]
	},
	{
		intent: 'reject_task_approval',
		steps: [
			{
				tool: 'ams_manifest',
				phase: 'discover',
				purpose: 'Confirm the available approval decision commands before rejecting the request.'
			},
			{
				tool: 'ams_task_get',
				phase: 'inspect',
				purpose: 'Inspect the current task and approval state before rejecting it.'
			},
			{
				tool: 'ams_task_reject_approval',
				phase: 'mutate',
				purpose: 'Reject the active approval request when the task is not ready to pass.'
			},
			{
				tool: 'ams_task_get',
				phase: 'readback',
				purpose: 'Verify that the rejected approval decision is now recorded on the task.'
			}
		]
	},
	{
		intent: 'request_child_handoff_changes',
		steps: [
			{
				tool: 'ams_manifest',
				phase: 'discover',
				purpose:
					'Confirm the available child handoff decision commands before returning delegated work.'
			},
			{
				tool: 'ams_task_get',
				phase: 'inspect',
				purpose: 'Inspect the parent task and child handoff state before requesting follow-up.'
			},
			{
				tool: 'ams_task_request_child_handoff_changes',
				phase: 'mutate',
				purpose: 'Return the delegated child handoff for follow-up instead of accepting it.'
			},
			{
				tool: 'ams_task_get',
				phase: 'readback',
				purpose: 'Verify that the parent task now reflects the requested handoff follow-up.'
			}
		]
	},
	{
		intent: 'coordinate_with_another_thread',
		steps: [
			{
				tool: 'ams_manifest',
				phase: 'discover',
				purpose: 'Confirm the thread-routing tools before contacting another thread.'
			},
			{
				tool: 'ams_thread_best_target',
				phase: 'inspect',
				purpose: 'Resolve the most relevant contactable thread for the current task context.'
			},
			{
				tool: 'ams_thread_contact',
				phase: 'mutate',
				purpose: 'Send the focused request to the selected thread.'
			},
			{
				tool: 'ams_thread_contacts',
				phase: 'readback',
				purpose: 'Verify that the contact was recorded and is available for follow-up.'
			}
		]
	}
];
