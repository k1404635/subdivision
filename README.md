# catmull-clark-and-loop-subdivision
Sooyeon Yang (sy22975), Coco Zhou (ccz247)

Our project is implementing Catmull-Clark and Loop Subdivision. We built our code on top of the
starter code for virtual mannequin. Keys 1-5 show various intermediate subdivision levels of Loop Subdivision. 
Keys 6-0 show various intermediate subdivision levels of Catmull-Clark. Key 5 is our limit surface for Loop 
Subdivision. Key 0 is our limit surface for Catmull-Clark. 

The formulas/rules we used for Loop Subdivision and Catmull-Clark should implicitly handle extraordinary vertices, 
making them not edge cases for our implementation. We also handle boundary vertices/edges in our code for Loop 
Subdivision and Catmull-Clark, but our gradeable artifacts do not include images of a mesh that tests this.

The main files we edited are: 
- Subdivision.ts (newly created file that contains our functions for Catmull-Clark and Loop Subdivision)
    - This file should contain most of our subdivision work, including creating adjacent data structues for both 
    subdivision techniques and the actual implementations of Catmull-Clark and Loop Subdivision.
- AnimationFileLoader.ts (modified and added support for quad meshes as .obj files)
    - Added ability to parse .obj files to support the use of quad meshes for Catmull-Clark
- Gui.ts (modified keys and number of iterations accordingly)
- App.ts (minor edits on function parameters)

Gradeable Artifacts: 
- Our gradeable artifacts are contained in the gradeable-artifacts folder, with Catmull-Clark images in the 
catmull_clark folder and similarly, Loop Subdivision images in the loop_subdivision folder. 
- We have included images of various iterations for two meshes: a simple cube mesh and a "cross" mesh, each named
according to the mesh it corresponds to. 

Note:
- Sometimes at our limit surface iteration (Digit 5 and 0), the page will say something along the lines of "page 
is not responsive," but if you click "wait," the result will show soon after.

Extra Credit: 
- Online Course Instructor Survey
    - On our honor, we have both completed the online course instructor survery (eCis) for this class. 