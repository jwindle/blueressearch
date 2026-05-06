# Motivation

Hey all 👋!  Your résumé is public.  Job posts are public.  Given that neither
of these data are private, there should be a completely open ecosystem of
matching people looking for jobs with people trying to fill jobs.

There has been some good work in that direction.  As of writing this, it seems
like <https://sifa.id> has a lot of momentum.  Sifa is focused on enabling
individuals to publish and possess their résumés and professional network.

Here, I want to explore something slightly different: the job-matching process.
In particular, I want to take a look at how people are matched to jobs and how
that relates to optimizing a résumé for a given job post.

To tackle this, I will rely solely on semantic embeddings.  This is, admittedly,
a somewhat small step.  LLMs already do a very good job of telling you how your
résumé matches a job post.  In fact, this is now a feature built into LinkedIn.
An agent will assess how well your résumé matches a job posting and can also
make suggestions about what is missing.

But relying on an LLM doesn't seem strictly necessary to me.  Job posts and
résumés often include quite a bit of structured data.  Effectively, what one
wants to do is try to match data from a job post with data in a résumé.  If we
can do a decent job matching job posts and résumés with semantic embeddings,
then we have a POC that this is not a poorly posed problem, but rather one
that we can clearly articulate.

Why does this matter?  Because transparency matters.  Right now AI is being used
to filter your résumé when you apply for a job.  It's a bit of a game.  The game
would be much more fair if we all knew exactly how that filtering process
worked.  Here, I want to show that it should be possible to be much more
transparent about that process.

To be clear, my aim here is more POC than MVP, but I have built some
infrastructure to validate that POC.

# Approach

To start, we need to impose some structure on résumés and job posts.  For
résumés, I will use [jsonresume](https://jsonresume.org/) (with a few additions
for fun).  For job posts, I just created my own generic schema.  In my
experience a job post will typically have what I call "Employee Traits", which
are the qualities sought in the potential employee, and "Job Traits", which are
the things you will need to do on the job.  For Employee Traits, you see things
like "Requirements" and "Nice-to-Haves" whereas for Job Traits you see things
like "Responsibilities".

The approach here is meant to be arbitrary, so the specifics of the schema do
not really matter.  Rather, the key is how one extracts text from the data for
embedding.  The process is the same for both:

```
Job post -> List of extracted texts -> Embeddings for job post
Résumé -> List of extracted texts -> Embeddings for résumés
```

The nice thing about the above diagram, is that you can see that this is a
generic process, which effectively maps a document into a list of vector
embeddings.  By using the same embedder for each, we can link the semantics of
both types of documents.

There are two immediate use-cases: i) search and ii) matching.  By search, I
mean the process of finding a job post or résumé of interest.  By matching, I
mean the ability to score how well a job post matches a résumé.

## Search and Match

There are lots of options for search.  You will find three options, as of this writing:
- Top 1: find documents that match a single embedding well
- Top K: find documents with multiple parts that match a single embedding well
- Multi: find documents that match multiple embeddings well

In addition to the semantic search, you can also filter results based on
specific criteria within a document, like job title for a job post.

There are lots of options for matching as well.  Currently, you will find one
very simple approach: for each embedding in a reference document, find the best
matching embedding in another and then average over all embeddings in the
reference.


# Sitemaps

If you navigate to <https://search.blueres.org> (I am not claiming to be good at
naming things!) you will find a site with some fake (and maybe real) data.

You can:
- Search jobs and résumés
- Match text within jobs and résumés
- Convert text to a json job post or a json résumé

If you want to add your own data and see how it works, there are sites for
saving a job post or résumé to your PDS at
- <https://jobs.blueres.org>
- <https://res.blueres.org>

A Jetstream listener is configured to index new additions automatically, though
availability may be spotty.  Thus, on the search pages you will also find links
to manually add data from a PDS, if that proves to be necessary.

