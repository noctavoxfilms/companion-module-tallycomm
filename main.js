const { InstanceBase, runEntrypoint, InstanceStatus } = require('@companion-module/base')

const DEFAULT_SERVER = 'https://tallycomm.com'
const MAX_CAMS = 6

class TallyCommInstance extends InstanceBase {
	constructor(internal) {
		super(internal)
		this.currentPgm = 0
		this.currentPvw = 0
		this.serverUrl = DEFAULT_SERVER
		this.room = ''
		this._isConnected = false
	}

	async init(config) {
		this.config = config
		this.serverUrl = (config.server || DEFAULT_SERVER).replace(/\/$/, '')
		this.room = config.room || ''
		this.updateStatus(InstanceStatus.Ok)
		this.initActions()
		this.initFeedbacks()
		this.initVariables()
		this.updateVariables()
		// Check connection async — do NOT await
		this.checkConnection()
	}

	async destroy() {
		this.log('debug', 'TallyComm destroyed')
	}

	async configUpdated(config) {
		this.config = config
		this.serverUrl = (config.server || DEFAULT_SERVER).replace(/\/$/, '')
		this.room = config.room || ''
		this.updateVariables()
		this.checkConnection()
	}

	getConfigFields() {
		return [
			{
				type: 'static-text',
				id: 'info',
				width: 12,
				label: 'TallyComm',
				value: 'Envía tally a smartphones vía TallyComm. La sala debe coincidir con la que usan los camarógrafos al conectarse.',
			},
			{
				type: 'textinput',
				id: 'server',
				label: 'Servidor',
				width: 8,
				default: DEFAULT_SERVER,
				tooltip: 'URL del servidor TallyComm',
			},
			{
				type: 'textinput',
				id: 'room',
				label: 'Sala / Evento',
				width: 8,
				default: '',
				placeholder: 'ej: show-2026',
				tooltip: 'Nombre exacto de la sala. Debe coincidir con el que usan los camarógrafos.',
				required: true,
			},
		]
	}

	initActions() {
		const camChoices = []
		for (let i = 1; i <= MAX_CAMS; i++) {
			camChoices.push({ id: String(i), label: 'Camera ' + i })
		}

		this.setActionDefinitions({
			set_pgm: {
				name: 'Set Camera PGM',
				description: 'Pone la cámara en Program (rojo)',
				options: [{ type: 'dropdown', id: 'camera', label: 'Camera', default: '1', choices: camChoices }],
				callback: async (action) => {
					const cam = parseInt(action.options.camera)
					await this.sendTally(cam, 'program')
					this.currentPgm = cam
					this.updateVariables()
					this.checkFeedbacks('cam_pgm', 'cam_pvw')
				},
			},

			set_pvw: {
				name: 'Set Camera PVW',
				description: 'Pone la cámara en Preview (verde)',
				options: [{ type: 'dropdown', id: 'camera', label: 'Camera', default: '1', choices: camChoices }],
				callback: async (action) => {
					const cam = parseInt(action.options.camera)
					await this.sendTally(cam, 'preview')
					this.currentPvw = cam
					this.updateVariables()
					this.checkFeedbacks('cam_pgm', 'cam_pvw')
				},
			},

			clear_cam: {
				name: 'Clear Camera',
				description: 'Quita la cámara de PGM y PVW',
				options: [{ type: 'dropdown', id: 'camera', label: 'Camera', default: '1', choices: camChoices }],
				callback: async (action) => {
					const cam = parseInt(action.options.camera)
					await this.sendTally(cam, 'clear')
					if (this.currentPgm === cam) this.currentPgm = 0
					if (this.currentPvw === cam) this.currentPvw = 0
					this.updateVariables()
					this.checkFeedbacks('cam_pgm', 'cam_pvw')
				},
			},

			clear_all: {
				name: 'Clear All',
				description: 'Quita todas las cámaras de PGM y PVW',
				options: [],
				callback: async () => {
					const promises = []
					if (this.currentPgm > 0) promises.push(this.sendTally(this.currentPgm, 'clear'))
					if (this.currentPvw > 0 && this.currentPvw !== this.currentPgm) {
						promises.push(this.sendTally(this.currentPvw, 'clear'))
					}
					await Promise.all(promises)
					this.currentPgm = 0
					this.currentPvw = 0
					this.updateVariables()
					this.checkFeedbacks('cam_pgm', 'cam_pvw')
				},
			},

			set_pgm_auto: {
				name: 'Set PGM + Clear Previous',
				description: 'Pone en PGM y libera la cámara anterior automáticamente. La acción más útil para triggers de switcher.',
				options: [{ type: 'dropdown', id: 'camera', label: 'Camera', default: '1', choices: camChoices }],
				callback: async (action) => {
					const cam = parseInt(action.options.camera)
					const prev = this.currentPgm
					if (prev > 0 && prev !== cam) await this.sendTally(prev, 'clear')
					await this.sendTally(cam, 'program')
					this.currentPgm = cam
					if (this.currentPvw === cam) this.currentPvw = 0
					this.updateVariables()
					this.checkFeedbacks('cam_pgm', 'cam_pvw')
				},
			},

			set_pvw_auto: {
				name: 'Set PVW + Clear Previous',
				description: 'Pone en PVW y libera la cámara anterior automáticamente.',
				options: [{ type: 'dropdown', id: 'camera', label: 'Camera', default: '1', choices: camChoices }],
				callback: async (action) => {
					const cam = parseInt(action.options.camera)
					const prev = this.currentPvw
					if (prev > 0 && prev !== cam) await this.sendTally(prev, 'clear')
					await this.sendTally(cam, 'preview')
					this.currentPvw = cam
					this.updateVariables()
					this.checkFeedbacks('cam_pgm', 'cam_pvw')
				},
			},
		})
	}

	initFeedbacks() {
		const camChoices = []
		for (let i = 1; i <= MAX_CAMS; i++) {
			camChoices.push({ id: String(i), label: 'Camera ' + i })
		}

		this.setFeedbackDefinitions({
			cam_pgm: {
				type: 'boolean',
				name: 'Camera is PGM',
				description: 'Activo cuando la cámara está en Program',
				defaultStyle: { bgcolor: 0xff0000, color: 0xffffff },
				options: [{ type: 'dropdown', id: 'camera', label: 'Camera', default: '1', choices: camChoices }],
				callback: (feedback) => {
					return this.currentPgm === parseInt(feedback.options.camera)
				},
			},

			cam_pvw: {
				type: 'boolean',
				name: 'Camera is PVW',
				description: 'Activo cuando la cámara está en Preview',
				defaultStyle: { bgcolor: 0x009900, color: 0xffffff },
				options: [{ type: 'dropdown', id: 'camera', label: 'Camera', default: '1', choices: camChoices }],
				callback: (feedback) => {
					return this.currentPvw === parseInt(feedback.options.camera)
				},
			},

			is_connected: {
				type: 'boolean',
				name: 'Is Connected',
				description: 'Activo cuando el módulo está conectado a TallyComm',
				defaultStyle: { bgcolor: 0x009900, color: 0xffffff },
				options: [],
				callback: () => {
					return this._isConnected === true
				},
			},
		})
	}

	initVariables() {
		this.setVariableDefinitions([
			{ variableId: 'pgm', name: 'Current PGM camera (0 = none)' },
			{ variableId: 'pvw', name: 'Current PVW camera (0 = none)' },
			{ variableId: 'room', name: 'Room name' },
			{ variableId: 'connected', name: 'online / offline' },
		])
	}

	updateVariables() {
		this.setVariableValues({
			pgm: this.currentPgm,
			pvw: this.currentPvw,
			room: this.room,
			connected: this._isConnected === true ? 'online' : 'offline',
		})
	}

	async sendTally(camera, bus) {
		if (!this.room) {
			this.log('warn', 'Sala no configurada — configura el nombre de sala en la conexión')
			this.updateStatus(InstanceStatus.BadConfig, 'Sala no configurada')
			return
		}
		try {
			const response = await fetch(this.serverUrl + '/api/tally', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ camera: camera, bus: bus, room: this.room }),
				signal: AbortSignal.timeout(5000),
			})
			if (!response.ok) {
				this.log('error', 'TallyComm HTTP ' + response.status)
				this.updateStatus(InstanceStatus.UnknownError, 'HTTP ' + response.status)
				return
			}
			this._isConnected = true
			this.log('debug', 'Tally sent: cam=' + camera + ' bus=' + bus + ' room=' + this.room)
			this.updateStatus(InstanceStatus.Ok)
		} catch (err) {
			this.log('error', 'Error connecting to TallyComm: ' + err.message)
			this.updateStatus(InstanceStatus.ConnectionFailure, err.message)
		}
	}

	checkConnection() {
		fetch(this.serverUrl + '/api/tally', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ camera: 0, bus: 'ping', room: this.room || 'companion-check' }),
			signal: AbortSignal.timeout(5000),
		})
			.then(() => {
				this._isConnected = true
				this.updateStatus(InstanceStatus.Ok)
				this.updateVariables()
				this.checkFeedbacks('is_connected')
			})
			.catch((err) => {
				this._isConnected = false
				this.log('warn', 'Cannot reach TallyComm: ' + err.message)
				this.updateStatus(InstanceStatus.ConnectionFailure, 'No se puede conectar')
				this.updateVariables()
				this.checkFeedbacks('is_connected')
			})
	}
}

runEntrypoint(TallyCommInstance, [])
