import express from 'express';
import bodyParser from 'body-parser';
import session from 'express-session';

const app = express(); 
const PORT = process.env.PORT || 3000; 

// Middleware
app.use(bodyParser.urlencoded({ extended: true })); // Använder bodyParser för att tolka url-encoded data från förfrågningar
app.use(express.static("public")); // Ange en mapp för statiska filer (till exempel CSS och bilder)
app.set("view engine", "ejs"); // Ange vy-motorn till EJS (Embedded JavaScript)

// Konfigurera sessionshantering
app.use(session({
  secret: "hemlig", // Hemlig nyckel för att signera session-id
  resave: false, // Sparar inte sessionen om det inte finns några ändringar
  saveUninitialized: false // Sparar inte tomma sessioner
}));

let users = [
  { username: 'User1', password: 'Pass1' },
  { username: 'User2', password: 'Pass2' }
];

let blogPosts = []; // Tom array för att lagra blogginlägg

// Middleware-funktion för att kontrollera autentisering
const requireLogin = (req, res, next) => {
  if (req.session.user) {
    next(); // Fortsätt om användaren är inloggad
  } else {
    res.redirect('/bloggar/login'); // Omdirigera till inloggningssidan om användaren inte är inloggad
  }
};

app.get('/', (req, res) => {
  res.redirect("/bloggar"); // Omdirigera rot-URL till bloggsidan
});

app.get('/bloggar', (req, res) => {
  let { searchTerm } = req.query; // Hämta söktermen från förfrågan
  let filteredPosts = blogPosts; // Förvara alla inlägg som standard

  // Filtrera inlägg baserat på söktermen om den finns
  if (searchTerm) {
    searchTerm = searchTerm.toLowerCase(); // Konvertera söktermen till små bokstäver för att underlätta jämförelse
    filteredPosts = blogPosts.filter(post => post.title.toLowerCase().includes(searchTerm) || post.category.toLowerCase().includes(searchTerm) || post.author.toLowerCase().includes(searchTerm) || post.text.toLowerCase().includes(searchTerm) || post.date.toLowerCase().includes(searchTerm));
  }

  // Hämta unika kategorier från blogginläggen
  let uniqueCategories = getUniqueCategories(blogPosts);
  
  // Rendera huvudvyn och skicka med data för inloggad användare, blogginlägg, unika kategorier och sökterm
  res.render('index', { user: req.session.user, blogPosts: filteredPosts, uniqueCategories, searchTerm });
});

// Funktion för att hämta unika kategorier från en lista med blogginlägg
function getUniqueCategories(posts) {
  let categories = posts.map(post => post.category); // Hämta kategorier från varje inlägg
  return [...new Set(categories)]; // Returnera en array med unika kategorier
}

// Visa alla blogginlägg
app.get('/bloggar', (req, res) => {
  res.render('index', { user: req.session.user, blogPosts }); // Rendera huvudvyn med alla blogginlägg
});

// Visa sidan för att skapa ett blogginlägg (kräver inloggning)
app.get('/bloggar/skapa-blogg', requireLogin, (req, res) => {
  res.render('Skapablog'); // Rendera sidan för att skapa blogginlägg
});

// Hantera postförfrågan för att skapa ett blogginlägg (kräver inloggning)
app.post('/bloggar/skapa-blogg', requireLogin, (req, res) => {
  const { title, category, author, text, date } = req.body; // Hämta data från förfrågan
  const id = blogPosts.length + 1; // Skapa ett nytt ID för det nya blogginlägget
  blogPosts.push({ id, title, category, author, text, date }); // Lägg till det nya blogginlägget i listan med blogginlägg
  res.redirect('/bloggar'); // Omdirigera till bloggsidan
});

// Visa ett enskilt blogginlägg
app.get('/bloggar/blogg/:id', (req, res) => {
  const blogId = req.params.id; // Hämta ID för det efterfrågade blogginlägget
  const blogPost = blogPosts.find(post => post.id === parseInt(blogId)); // Hitta det blogginlägg med det matchande ID:et
  res.render('blogg', { blogPost }); // Rendera sidan för det enskilda blogginlägget
});

// Visa sidan för att redigera ett blogginlägg (kräver inloggning)
app.get('/bloggar/blogg/:id/redigera', requireLogin, (req, res) => {
  const blogId = req.params.id; // Hämta ID för det efterfrågade blogginlägget
  const blogPost = blogPosts.find(post => post.id === parseInt(blogId)); // Hitta det blogginlägg med det matchande ID:et
  res.render('edit', { postToEdit: blogPost }); // Rendera sidan för redigering av blogginlägget och skicka med data för det valda blogginlägget
});

// Hantera postförfrågan för att uppdatera ett blogginlägg (kräver inloggning)
app.post('/bloggar/blogg/:id/redigera', requireLogin, (req, res) => {
  const blogId = req.params.id; // Hämta ID för det efterfrågade blogginlägget
  const { title, category, author, text, date } = req.body; // Hämta data från förfrågan
  const index = blogPosts.findIndex(post => post.id === parseInt(blogId)); // Hitta index för det blogginlägg som ska uppdateras
  blogPosts[index] = { ...blogPosts[index], title, category, author, text, date }; // Uppdatera blogginlägget med den nya informationen
  res.redirect('/bloggar'); // Omdirigera till bloggsidan
});

// Visa sidan för att radera ett blogginlägg (kräver inloggning)
app.get('/bloggar/blogg/:id/radera', requireLogin, (req, res) => {
  const blogId = req.params.id; // Hämta ID för det efterfrågade blogginlägget
  blogPosts = blogPosts.filter(post => post.id !== parseInt(blogId)); // Filtrera bort det blogginlägg som ska raderas
  res.redirect('/bloggar'); // Omdirigera till bloggsidan
});

// Hantera postförfrågan för att radera ett blogginlägg (kräver inloggning)
app.post('/bloggar/blogg/:id/radera', requireLogin, (req, res) => {
  const blogId = req.params.id; // Hämta ID för det efterfrågade blogginlägget
  blogPosts = blogPosts.filter(post => post.id !== parseInt(blogId)); // Filtrera bort det blogginlägg som ska raderas
  res.redirect('/bloggar'); // Omdirigera till bloggsidan
});

// Visa inloggningssidan
app.get('/bloggar/login', (req, res) => {
  res.render('login'); // Rendera inloggningssidan
});

// Hantera postförfrågan för inloggning
app.post('/bloggar/login', (req, res) => {
  const { username, password } = req.body; // Hämta användarnamn och lösenord från förfrågan
  const user = users.find(user => user.username === username && user.password === password); // Kontrollera om användaren finns i användardatabasen och lösenordet är korrekt
  if (user) {
    req.session.user = user.username; // Spara användarens användarnamn i sessionsdata
    res.redirect('/bloggar'); // Omdirigera till bloggsidan efter inloggning
  } else {
    res.send('Ogiltigt användarnamn eller lösenord'); // Skicka ett felmeddelande om inloggningen misslyckas
  }
});

// Visa sidan för att logga ut (kräver inloggning)
app.get('/bloggar/logout', (req, res) => {
  req.session.destroy((err) => { // Ta bort sessionsdata när användaren loggar ut
    if (err) {
      console.log(err); // Logga eventuella fel
    } else {
      res.redirect('/bloggar'); // Omdirigera till bloggsidan efter utloggning
    }
  });
});

app.listen(PORT, () => {
  console.log(`Servern lyssnar på port ${PORT}`); // Meddelande som bekräftar att servern har startats
});