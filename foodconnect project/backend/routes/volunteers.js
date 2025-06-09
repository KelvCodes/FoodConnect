
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
