/*! docx-renderer 0.2.x browser compatibility integration.
    docx-renderer descends from docx-preview/docx-preview-sync; this compact offline adapter exposes
    its render/parse contract over the vendored layout core and adds deterministic paragraph pagination. */
(function(g){'use strict';var core=g.docx;if(!core)return;
function renderedPageSections(container){
  var all=Array.from(container.querySelectorAll('.docx-wrapper section.docx'));
  return all.filter(function(page){return !all.some(function(other){return other!==page&&other.contains(page);});});
}
function paginateOverflow(container){
  var sections=renderedPageSections(container);
  sections.forEach(function(source){
    var article=source.querySelector(':scope > article');if(!article)return;
    var probe=source.cloneNode(false);probe.style.visibility='hidden';probe.style.position='absolute';probe.style.left='-100000px';source.parentNode.insertBefore(probe,source);
    var target=Math.round(probe.getBoundingClientRect().height||1056);probe.remove();if(source.getBoundingClientRect().height<=target+3)return;
    var wrapper=source.parentNode,nodes=Array.from(article.childNodes),before=[],after=[],seen=false;
    Array.from(source.children).forEach(function(n){if(n===article){seen=true;return;}(seen?after:before).push(n);});
    function makePage(){var page=source.cloneNode(false);page.style.height=target+'px';page.style.minHeight=target+'px';page.style.overflow='hidden';before.forEach(function(n){page.appendChild(n.cloneNode(true));});var body=article.cloneNode(false);page.appendChild(body);after.forEach(function(n){page.appendChild(n.cloneNode(true));});wrapper.insertBefore(page,source);return{page:page,body:body};}
    var current=makePage();nodes.forEach(function(node){current.body.appendChild(node);if(current.page.scrollHeight>current.page.clientHeight+2&&current.body.childNodes.length>1){current.body.removeChild(node);current=makePage();current.body.appendChild(node);}});source.remove();
  });
}
async function render(data,body,styles,options){var opts=Object.assign({className:'docx',inWrapper:true,ignoreWidth:false,ignoreHeight:false,ignoreFonts:false,breakPages:true,ignoreLastRenderedPageBreak:true,experimental:false,renderHeaders:true,renderFooters:true,renderFootnotes:true,renderEndnotes:true,renderAltChunks:true},options||{});var parsed=null;if(typeof core.parseAsync==='function'&&typeof core.renderDocument==='function'){parsed=await core.parseAsync(data,opts);await core.renderDocument(parsed,body,styles||body,opts);}else await core.renderAsync(data,body,styles||body,opts);if(opts.breakPages!==false)paginateOverflow(body);return{document:parsed,dispose:function(){}};}
g.docxRenderer=Object.freeze({version:'0.2.2-compatible-offline',render:render,renderAsync:render,paginate:paginateOverflow,parseAsync:function(data,options){if(!core.parseAsync)throw new Error('parseAsync no disponible');return core.parseAsync(data,options);}});
})(window);
