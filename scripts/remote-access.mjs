const provider = process.env.AMS_REMOTE_ACCESS_PROVIDER?.trim() || 'tailscale';
const command = process.argv[2] ?? 'status';

const providerModules = {
	tailscale: './remote-access-tailscale.mjs'
};

if (!(provider in providerModules)) {
	process.stderr.write(`Unknown remote access provider: ${provider}\n`);
	process.exit(1);
}

const module = await import(providerModules[provider]);

switch (command) {
	case 'start':
		await module.startRemoteAccess();
		break;
	case 'stop':
		await module.stopRemoteAccess();
		break;
	case 'status':
		await module.showRemoteStatus();
		break;
	default:
		process.stderr.write('Unknown command. Use start, stop, or status.\n');
		process.exit(1);
}
