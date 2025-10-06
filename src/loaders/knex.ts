import {knex, Knex} from 'knex';
import config from '../config';

export default (): Knex => {
    return knex({
        client: config.db.client,
        connection: {
            host: config.db.host,
            port: config.db.port,
            user: config.db.user,
            password: config.db.password,
            database: config.db.database,
        }
    });
}
