const EventEmitter = require('events');
class MachineEventBus extends EventEmitter { }
const eventBus = new MachineEventBus();

module.exports = eventBus;
