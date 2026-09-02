const MAX_CAMS = 8 // mirrors CFG.CAM_MAX on the TallyComm server

module.exports.UpdateFeedbacks = function (self) {
	const camChoices = []
	for (let i = 1; i <= MAX_CAMS; i++) {
		camChoices.push({ id: String(i), label: 'Camera ' + i })
	}

	self.setFeedbackDefinitions({
		cam_pgm: {
			type: 'boolean',
			name: 'Camera is PGM',
			description: 'Active when the camera is on Program',
			defaultStyle: { bgcolor: 0xff0000, color: 0xffffff },
			options: [{ type: 'dropdown', id: 'camera', label: 'Camera', default: '1', choices: camChoices }],
			callback: (feedback) => {
				return self.currentPgm === parseInt(feedback.options.camera)
			},
		},

		cam_pvw: {
			type: 'boolean',
			name: 'Camera is PVW',
			description: 'Active when the camera is on Preview',
			defaultStyle: { bgcolor: 0x009900, color: 0xffffff },
			options: [{ type: 'dropdown', id: 'camera', label: 'Camera', default: '1', choices: camChoices }],
			callback: (feedback) => {
				return self.currentPvw === parseInt(feedback.options.camera)
			},
		},

		is_connected: {
			type: 'boolean',
			name: 'Is Connected',
			description: 'Active when the module is connected to TallyComm',
			defaultStyle: { bgcolor: 0x009900, color: 0xffffff },
			options: [],
			callback: () => {
				return self._isConnected === true
			},
		},
	})
}
