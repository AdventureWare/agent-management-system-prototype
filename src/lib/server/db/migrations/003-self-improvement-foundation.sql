create table if not exists self_improvement_entries (
	collection text not null,
	id text not null,
	position integer not null,
	payload text not null,
	primary key (collection, id)
);

create index if not exists idx_self_improvement_entries_collection_position
	on self_improvement_entries (collection, position);
