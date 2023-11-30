export default async ({ action }, { services, exceptions, logger }) => {
	// const { InvalidPayloadException } = exceptions;
	const { ItemsService } = services;

	action('token.items.create', async (input, { collection, database, schema }) => {
		logger.info('token.items.create event fired and filtered by extension');
		logger.debug('input: ' + JSON.stringify(input));
		const tokenService = new ItemsService(input["collection"], { knex: database, schema });
		await tokenService.readByQuery({ fields: ['*.*'] })
			.then(allTokens => {
				logger.debug('allTokens: ' + JSON.stringify(allTokens));
			});
	});
};