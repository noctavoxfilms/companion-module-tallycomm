const MAX_CAMS = 8 // mirrors CFG.CAM_MAX on the TallyComm server

module.exports.UpdateActions = function (self) {
	const camChoices = []
	for (let i = 1; i <= MAX_CAMS; i++) {
		camChoices.push({ id: String(i), label: 'Camera ' + i })
	}

	self.setActionDefinitions({
		set_pgm: {
			name: 'Set Camera PGM',
			description: 'Put a camera on Program (red)',
			options: [{ type: 'dropdown', id: 'camera', label: 'Camera', default: '1', choices: camChoices }],
			callback: async (action) => {
				const cam = parseInt(action.options.camera)
				await self.sendTally(cam, 'program')
				self.currentPgm = cam
				self.updateVariables()
				self.checkFeedbacks('cam_pgm', 'cam_pvw')
			},
		},

		set_pvw: {
			name: 'Set Camera PVW',
			description: 'Put a camera on Preview (green)',
			options: [{ type: 'dropdown', id: 'camera', label: 'Camera', default: '1', choices: camChoices }],
			callback: async (action) => {
				const cam = parseInt(action.options.camera)
				await self.sendTally(cam, 'preview')
				self.currentPvw = cam
				self.updateVariables()
				self.checkFeedbacks('cam_pgm', 'cam_pvw')
			},
		},

		clear_cam: {
			name: 'Clear Camera',
			description: 'Remove a camera from PGM and PVW',
			options: [{ type: 'dropdown', id: 'camera', label: 'Camera', default: '1', choices: camChoices }],
			callback: async (action) => {
				const cam = parseInt(action.options.camera)
				await self.sendTally(cam, 'clear')
				if (self.currentPgm === cam) self.currentPgm = 0
				if (self.currentPvw === cam) self.currentPvw = 0
				self.updateVariables()
				self.checkFeedbacks('cam_pgm', 'cam_pvw')
			},
		},

		clear_all: {
			name: 'Clear All',
			description: 'Remove all cameras from PGM and PVW',
			options: [],
			callback: async () => {
				const promises = []
				if (self.currentPgm > 0) promises.push(self.sendTally(self.currentPgm, 'clear'))
				if (self.currentPvw > 0 && self.currentPvw !== self.currentPgm) {
					promises.push(self.sendTally(self.currentPvw, 'clear'))
				}
				await Promise.all(promises)
				self.currentPgm = 0
				self.currentPvw = 0
				self.updateVariables()
				self.checkFeedbacks('cam_pgm', 'cam_pvw')
			},
		},

		set_pgm_auto: {
			name: 'Set PGM + Clear Previous',
			description: 'Set PGM and clear the previous camera automatically. Most useful for switcher triggers.',
			options: [{ type: 'dropdown', id: 'camera', label: 'Camera', default: '1', choices: camChoices }],
			callback: async (action) => {
				const cam = parseInt(action.options.camera)
				const prev = self.currentPgm
				if (prev > 0 && prev !== cam) await self.sendTally(prev, 'clear')
				await self.sendTally(cam, 'program')
				self.currentPgm = cam
				if (self.currentPvw === cam) self.currentPvw = 0
				self.updateVariables()
				self.checkFeedbacks('cam_pgm', 'cam_pvw')
			},
		},

		set_pvw_auto: {
			name: 'Set PVW + Clear Previous',
			description: 'Set PVW and clear the previous camera automatically.',
			options: [{ type: 'dropdown', id: 'camera', label: 'Camera', default: '1', choices: camChoices }],
			callback: async (action) => {
				const cam = parseInt(action.options.camera)
				const prev = self.currentPvw
				// Don't clear the previous PVW cam if it is currently on PGM. The
				// server enforces "PGM wins over PVW" by ignoring set_pvw requests
				// for cameras already on program — so locally `currentPvw` may point
				// to a camera the server actually has on PGM only. Clearing it would
				// erroneously kill the on-air tally.
				if (prev > 0 && prev !== cam && prev !== self.currentPgm) {
					await self.sendTally(prev, 'clear')
				}
				await self.sendTally(cam, 'preview')
				self.currentPvw = cam
				self.updateVariables()
				self.checkFeedbacks('cam_pgm', 'cam_pvw')
			},
		},
	})
}
