require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// middleware: 各リクエストごとに supabase client を生成（ユーザーのトークンを使う）
app.use((req, res, next) => {
  const token = req.headers['authorization']?.replace('Bearer ', '');

  req.supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    }
  );

  next();
});

// GET: ユーザーのToDo取得（RLSにより自分の分だけ返る）
app.get("/todo-app", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError) return res.status(401).json({ error: "Unauthorized" });

  const { data, error } = await supabase
    .from("todos")
    .select("*")
    .eq("user_id", user.id);

  if (error) return res.status(500).json({ error });
  res.json(data);
});

// POST: ToDo追加（RLSが user_id = auth.uid() を保証している）
app.post('/todo-app', async (req, res) => {
  const { title, done } = req.body;

  const { data, error } = await req.supabase
    .from('todos')
    .insert([{ title, done }]);

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// DELETE: ToDo削除（自分のToDoだけ削除できる）
app.delete('/todo-app/:id', async (req, res) => {
  const { id } = req.params;

  const { data, error } = await req.supabase
    .from('todos')
    .delete()
    .eq('id', id);

  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json({ message: 'Deleted', id });
});

// PUT: ToDo更新（RLSにより他人のToDoは更新できない）
app.put('/todo-app/:id', async (req, res) => {
  const { id } = req.params;
  const { title, done } = req.body;

  const { data, error } = await req.supabase
    .from('todos')
    .update({ title, done })
    .eq('id', id);

  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json(data);
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
