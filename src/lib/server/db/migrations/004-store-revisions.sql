create table if not exists store_revisions (
	store_name text primary key,
	revision integer not null default 0,
	updated_at text not null
);
