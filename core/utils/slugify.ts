

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')    
    .replace(/['''\u2019]/g, '')        
    .replace(/[&/\\|]/g, ' ')           
    .replace(/[^a-z0-9\s-]/g, ' ')     
    .trim()
    .replace(/\s+/g, '-')               
    .replace(/-+/g, '-')                
    .replace(/^-|-$/g, '')              
}
