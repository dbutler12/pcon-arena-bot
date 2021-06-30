# pcon-arena-bot


**********Datastructures**********

def_str or off_str example: Illya_Monika_Pecorine_Jun_Kuka

Redis Strings:
	Version Data
		cur_version:  25.0.10
		prev_version: 25.0.9
		dead_version: 25.0.8 (anything before this is purged)

	Team Version Data
		def_str-off_str: 25.0.9

	Comment stored for user_tag
		(user_tag)-(version)-def_str-off_str-'comment': (User comment goes here!)


Redis Sets:
	User_Tags who have scored a team
		(version)-def_str-off_str-'score': (y or n)-(user_tag)

	Set of def_str-off_str for a version
		(version): def_str-off_str

	Master List
		(version)-'master': (version)-def_str-off_str-'score'
											: (version)-def_str-off_str-'tags'

Redis Sorted Sets:
	Defense team beaten by offense team
		def_str: off_str
	
	Scoring system for who left a comment for a team set
		(version)-def_str-off_str-'tags': (user_tag)
