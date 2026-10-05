// Runs before the app starts, in both root layouts. A browser that
// translates the page (Chrome does it by itself for a French page on an
// English phone) swaps each piece of text for its own wrapper. The app then
// tries to remove or move a piece of text that is no longer where it left
// it, the browser refuses, and the whole page was replaced by an error
// screen at the first touch. With this, such a request is simply let go and
// the page stays up.
export const TRANSLATE_GUARD = `(function(){
if(typeof Node!=="function"||!Node.prototype)return;
var remove=Node.prototype.removeChild;
Node.prototype.removeChild=function(child){
if(child&&child.parentNode!==this){if(child.parentNode)child.parentNode.removeChild(child);return child;}
return remove.apply(this,arguments);
};
var insert=Node.prototype.insertBefore;
Node.prototype.insertBefore=function(node,before){
if(before&&before.parentNode!==this){return this.appendChild(node);}
return insert.apply(this,arguments);
};
})();`;
