const fetch = require('node-fetch');

async function test() {
  const movies = [
    { id: '1', title: 'The Matrix', overview: 'A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.' },
    { id: '2', title: 'Spirited Away', overview: 'During her family\'s move to the suburbs, a sullen 10-year-old girl wanders into a world ruled by gods, witches, and spirits, and where humans are changed into beasts.' }
  ];

  try {
    const res = await fetch('http://localhost:3000/api/watch-for', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ movies })
    });
    
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(e);
  }
}

test();
