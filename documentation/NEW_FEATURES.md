I want to continue work on the Next.js version of the token manager.
Ignore angualr and vite for now.

1. Storage
Allow user to store their tokens in a database (mongo db)

2. CRUD
Allow user to create, read, update, and delete their tokens in the database (mongo db)

Tokens can be saved as a collection in the database via the tokens generator form.
Each collection must have a name.
Once saved, they also appear as a collectiosn in the 'view tokens' page.
THis means we will need to display multiple token collections on the view tokens page via a select input at top of page.

Collections can be also be loaded from the database into the tokens generator form.
This means we will need to display a button to load a collection into the tokens generator form.
From here we can display a diloag with collections listed from the database.
The user can select a collection to load into the tokens generator form.
Once loaded, the tokens generator form will be populated with the tokens from the collection.
The user can then edit the tokens and save them back to the database.
The user can also delete the collection from the database.
The user can also rename the collection from the database.
The user can also duplicate the collection from the database.


3. Collection Management:
Display a grid page of all collections form the database
This page also aloows us to create a new collection in the database.
Each collectiosn is displayed as a card in the grid. Each card linkks to the collection's page.
The collectiosn card should display the collection name, the number of tokens in the collection, and the last updated date.
No sidebar is displayed on this page.
THe collectiosn selector can be removed from the app header as we are using routes to navigate to each collections page.

Once a collection is selected, the user is navigated to the collection's page.
The collectiosn page shou;d contain a backlink to collections page(home page).
The collectiosn page shoudl contain the following:
Collection sidebar - as used in layout.tsx
Collection content -  tokens/config/settings
Each collection should have its own config and sync settings.
Form selectiosn for config and setting need to be saved to the database.




#Refactor token generation form: 

##Goal: Allow for subgroups in the token groups listForm content
Move empty name only groups into the sidebar list.The form only displayed groups with tokens.All groups can be accessed via the 

### groups list
See Example from http://localhost:3000/collections/69a0213b42f9fe4cfc19c568/

Groups list should be displayed as a tree structure.
The tree structure should be displayed as a list of groups.
The list tiem names shoud be interpreted from the group.name property.
DOnt display full json file names if found in the group.name property.
Display only the group name.

E.g brands/brand2/color.json
Display as Color
Note that the tree structure should be:
Brand2
  colors
    color - this is the group name



### Form content
In this collection the main content displays
- Level 0 light - in groups list already
- Level 1 collar - move to groups list
- Level 2 Brand - 2 tokens
…


### Breadcrumbs
Use the groups depth and name to display the breadcrumbs.
E.g brand2/colors/color
Note that the breadcrumbs should be displayed as a list of links.
THe links operate as per the groups list.

