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


---


# Bugs:

## Navigation issues:
THe group list does not change the content of the form.
Group list items should be links that change the form content.
E.g
Color - this is no trequired in the list
  Token - this is a namespace we dont need to see it in the list
    Color - this is a group name - we need to be able to add add subgroups or tokens here
     Brand - this is a group name with tokens - we need to be abe to add tokens here

     output tokens
     token(global namespace).color.brand.primary

When a grousp is selected the form contnet shoul only show a token list for the selected group.

## multi brand collections
For multi brand collections the brands shoudl be displayed top level groups

Brand1
  colors
Brand2
  colors

##nesting
There are too many nested groups in the form.
In this exampl only one level is required for 'font-family' tokens.
The rest can be hidden.

Font Family
   Token
      Font Family

