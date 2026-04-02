create table if not exists control_plane_records (
	collection text not null,
	id text not null,
	position integer not null,
	payload text not null,
	primary key (collection, id)
);

create index if not exists idx_control_plane_records_collection_position
	on control_plane_records (collection, position);
