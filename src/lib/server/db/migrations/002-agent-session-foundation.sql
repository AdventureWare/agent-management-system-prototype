create table if not exists agent_session_records (
	collection text not null,
	id text not null,
	position integer not null,
	payload text not null,
	primary key (collection, id)
);

create index if not exists idx_agent_session_records_collection_position
	on agent_session_records (collection, position);
